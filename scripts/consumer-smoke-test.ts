#!/usr/bin/env bun
/**
 * Consumer smoke test — proves a package is usable by a real consumer.
 *
 * Packs the package, then:
 *   1. asserts `"types"` is the FIRST key of every condition block in the exports
 *      map (see note below),
 *   2. installs the tarball into a throwaway TypeScript project and, for every
 *      subpath in the published `exports` map, type-checks
 *      `import * as m from "<pkg>[/subpath]"` with `tsc --noEmit` under
 *      `moduleResolution: node16`,
 *   3. imports every subpath at runtime with bun and asserts the module object
 *      has >= 1 key.
 *
 * Why step 1 is a separate assertion and not left to tsc: when `"types"` is listed
 * after `"import"`, TypeScript resolves the `import` condition to `./dist/x.js` and
 * then still finds the adjacent `./dist/x.d.ts` by filename convention — so a
 * mis-ordered exports map type-checks clean as long as the declarations happen to
 * sit next to the JS. It breaks for real consumers the moment declarations move,
 * are emitted under a different name, or a bundler honours condition order
 * strictly. The order is therefore asserted directly rather than inferred.
 *
 * The exports map is read from the TARBALL, not the working tree, so the check
 * always runs against the artifact that would actually be published.
 *
 * LOCAL INVOCATION
 * ----------------
 *   # pack + check the package in the current directory (run `bun run build` first)
 *   bun scripts/consumer-smoke-test.ts
 *
 *   # pack + check a package elsewhere
 *   bun scripts/consumer-smoke-test.ts --dir /path/to/packages/core
 *
 *   # check an already-built tarball (e.g. one from `npm pack <pkg>@<version>`)
 *   bun scripts/consumer-smoke-test.ts --tarball ./bunary-core-0.2.0.tgz
 *
 *   # keep the temp consumer project for inspection
 *   bun scripts/consumer-smoke-test.ts --keep
 *
 * Exits non-zero on the first failure.
 */

import { mkdtemp, mkdir, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

interface Args {
	dir: string;
	tarball?: string;
	keep: boolean;
}

function parseArgs(argv: string[]): Args {
	const args: Args = { dir: process.cwd(), keep: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--dir") args.dir = resolve(argv[++i] ?? ".");
		else if (arg === "--tarball") args.tarball = resolve(argv[++i] ?? "");
		else if (arg === "--keep") args.keep = true;
		else if (arg === "--help" || arg === "-h") {
			console.log("usage: bun scripts/consumer-smoke-test.ts [--dir <pkg-dir>] [--tarball <file>] [--keep]");
			process.exit(0);
		} else throw new Error(`unknown argument: ${arg}`);
	}
	return args;
}

async function run(cmd: string[], cwd: string): Promise<{ ok: boolean; out: string }> {
	const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const code = await proc.exited;
	return { ok: code === 0, out: `${stdout}${stderr}`.trim() };
}

async function mustRun(cmd: string[], cwd: string, what: string): Promise<string> {
	const { ok, out } = await run(cmd, cwd);
	if (!ok) {
		console.error(`\n::error::${what} failed\n${out}\n`);
		process.exit(1);
	}
	return out;
}

/** `bun pm pack` the package directory and return the tarball path. */
async function pack(dir: string, dest: string): Promise<string> {
	await mustRun(["bun", "pm", "pack", "--destination", dest], dir, "bun pm pack");
	const tarballs = (await readdir(dest)).filter((f) => f.endsWith(".tgz"));
	if (tarballs.length !== 1) throw new Error(`expected exactly one tarball in ${dest}, got ${tarballs.length}`);
	return join(dest, tarballs[0] as string);
}

/**
 * List every `*.tgz` under `<dir>/vendor`, e.g. a vendored optional peer that
 * isn't published to npm (see bunary-dev/http#93). Returns an empty array
 * when `vendor/` doesn't exist — a no-op for packages that don't vendor.
 */
async function vendoredTarballs(dir: string): Promise<string[]> {
	const vendorDir = join(dir, "vendor");
	let entries: string[];
	try {
		entries = await readdir(vendorDir);
	} catch {
		return [];
	}
	return entries.filter((f) => f.endsWith(".tgz")).map((f) => join(vendorDir, f));
}

/** Read package.json out of the tarball itself — the published artifact is the source of truth. */
async function manifestFromTarball(tarball: string): Promise<{ name: string; version: string; exports?: unknown }> {
	const { ok, out } = await run(["tar", "-xOf", tarball, "package/package.json"], process.cwd());
	if (!ok) throw new Error(`could not read package/package.json from ${tarball}:\n${out}`);
	return JSON.parse(out);
}

/** Every subpath in the exports map, skipping ./package.json. A string/absent map means "." only. */
function subpaths(exportsMap: unknown): string[] {
	if (!exportsMap || typeof exportsMap !== "object" || Array.isArray(exportsMap)) return ["."];
	const keys = Object.keys(exportsMap as Record<string, unknown>).filter((k) => k !== "./package.json");
	// A conditions-only map ({ "types": ..., "import": ... }) is the root export.
	if (keys.length > 0 && !keys.some((k) => k === "." || k.startsWith("./"))) return ["."];
	return keys.length > 0 ? keys : ["."];
}

/**
 * Assert `"types"` is the first key of every condition block in the exports map.
 * Returns a list of human-readable violations (empty means clean).
 */
function exportsOrderViolations(node: unknown, path = "exports"): string[] {
	if (!node || typeof node !== "object" || Array.isArray(node)) return [];
	const entries = Object.entries(node as Record<string, unknown>);
	const keys = entries.map(([k]) => k);
	const isSubpathBlock = keys.some((k) => k === "." || k.startsWith("./"));
	const problems: string[] = [];

	if (!isSubpathBlock) {
		// A conditions block: "types" must come first so every resolver sees it.
		if (!keys.includes("types")) {
			problems.push(`${path}: no "types" condition (consumers get no declarations)`);
		} else if (keys[0] !== "types") {
			problems.push(`${path}: "types" is listed after ${JSON.stringify(keys.slice(0, keys.indexOf("types")))} — it must be first`);
		}
	}

	for (const [key, value] of entries) {
		if (key === "./package.json") continue;
		problems.push(...exportsOrderViolations(value, `${path}[${JSON.stringify(key)}]`));
	}
	return problems;
}

function specifier(pkg: string, subpath: string): string {
	return subpath === "." ? pkg : `${pkg}/${subpath.replace(/^\.\//, "")}`;
}

function probeSource(spec: string): string {
	return [
		`import * as m from "${spec}";`,
		// Type-level probe: fails to compile if the package resolves no type declarations.
		`type Exports = typeof m;`,
		`type Keys = keyof Exports;`,
		`declare const __keys: Keys[];`,
		`export type __Probe = Keys;`,
		`export const __count: number = Object.keys(m as Record<string, unknown>).length;`,
		`void __keys;`,
		"",
	].join("\n");
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const workspace = await mkdtemp(join(tmpdir(), "consumer-smoke-"));
	const consumer = join(workspace, "consumer");
	const probeDir = join(consumer, "probes");

	try {
		// 1. pack ------------------------------------------------------------
		let tarball = args.tarball;
		if (!tarball) {
			const packDir = join(workspace, "pack");
			await mkdir(packDir, { recursive: true });
			tarball = await pack(args.dir, packDir);
		}
		const manifest = await manifestFromTarball(tarball);
		const pkg = manifest.name;
		const paths = subpaths(manifest.exports);
		console.log(`package : ${pkg}@${manifest.version}`);
		console.log(`tarball : ${tarball}`);
		console.log(`subpaths: ${paths.join(", ")}`);

		// 2. exports map condition order --------------------------------------
		console.log("\n→ exports map condition order");
		const violations = exportsOrderViolations(manifest.exports);
		if (violations.length > 0) {
			console.error(`\n::error::exports map is mis-ordered in ${pkg}@${manifest.version}`);
			for (const v of violations) console.error(`  ${v}`);
			process.exit(1);
		}
		console.log('  OK — "types" is first in every condition block');

		// 3. fresh consumer project ------------------------------------------
		await mkdir(probeDir, { recursive: true });
		await writeFile(
			join(consumer, "package.json"),
			`${JSON.stringify({ name: "consumer-smoke-test", private: true, version: "0.0.0", type: "module" }, null, 2)}\n`,
		);
		console.log("\n→ installing tarball + typescript@^7 + @types/bun");
		await mustRun(["bun", "add", tarball, "typescript@^7", "@types/bun"], consumer, "bun add");

		// Install any vendored optional peers (e.g. an unpublished dependency
		// shipped as a `file:` devDependency, see bunary-dev/http#93) so
		// subpaths that import them resolve in the consumer project too.
		// No-op when the calling repo has no vendor/ directory.
		const vendored = await vendoredTarballs(args.dir);
		if (vendored.length > 0) {
			console.log(`\n→ installing ${vendored.length} vendored tarball(s) from ${join(args.dir, "vendor")}`);
			for (const v of vendored) console.log(`  vendor: ${v}`);
			await mustRun(["bun", "add", ...vendored], consumer, "bun add (vendored tarballs)");
		}

		// 4. generate one probe per subpath -----------------------------------
		const files: string[] = [];
		for (const [i, subpath] of paths.entries()) {
			const spec = specifier(pkg, subpath);
			const file = `probes/probe-${i}.ts`;
			await writeFile(join(consumer, file), probeSource(spec));
			files.push(file);
			console.log(`  probe ${file} -> ${spec}`);
		}
		await writeFile(
			join(consumer, "tsconfig.json"),
			`${JSON.stringify(
				{
					compilerOptions: {
						module: "node16",
						moduleResolution: "node16",
						target: "esnext",
						strict: true,
						noEmit: true,
						skipLibCheck: true,
						types: ["bun"],
					},
					files,
				},
				null,
				2,
			)}\n`,
		);

		// 5. type check --------------------------------------------------------
		console.log("\n→ tsc --noEmit (moduleResolution: node16)");
		const tsc = await run(["./node_modules/.bin/tsc", "--noEmit", "-p", "tsconfig.json"], consumer);
		if (!tsc.ok) {
			console.error(`\n::error::consumer type check failed for ${pkg} — the published artifact is not usable from TypeScript`);
			console.error(tsc.out);
			process.exit(1);
		}
		console.log("  OK — every subpath resolves types");

		// 6. runtime import ----------------------------------------------------
		console.log("\n→ runtime import with bun");
		const specs = paths.map((p) => specifier(pkg, p));
		await writeFile(
			join(consumer, "runtime.ts"),
			[
				`const specs = ${JSON.stringify(specs)};`,
				`let failed = false;`,
				`for (const spec of specs) {`,
				`  try {`,
				`    const mod = await import(spec);`,
				`    const keys = Object.keys(mod);`,
				`    if (keys.length === 0) { console.error(\`  FAIL \${spec}: module object has no keys\`); failed = true; }`,
				`    else console.log(\`  OK   \${spec} (\${keys.length} export(s))\`);`,
				`  } catch (err) {`,
				`    console.error(\`  FAIL \${spec}: \${err}\`);`,
				`    failed = true;`,
				`  }`,
				`}`,
				`if (failed) process.exit(1);`,
				"",
			].join("\n"),
		);
		const runtime = await run(["bun", "run", "runtime.ts"], consumer);
		console.log(runtime.out);
		if (!runtime.ok) {
			console.error(`\n::error::runtime import failed for ${pkg}`);
			process.exit(1);
		}

		console.log(`\nconsumer smoke test PASSED for ${pkg}@${manifest.version} (${paths.length} subpath(s))`);
	} finally {
		if (args.keep) console.log(`\n(kept workspace: ${workspace})`);
		else await rm(workspace, { recursive: true, force: true });
	}
}

await main();
