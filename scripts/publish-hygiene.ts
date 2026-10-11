#!/usr/bin/env bun
/**
 * Publish hygiene lint — static checks on the artifact a package would publish.
 *
 * Packs the package (run `bun run build` first) and asserts:
 *   1. every condition block in the `exports` map lists `"types"` first and has
 *      a `"default"` fallback,
 *   2. a scoped package sets `publishConfig.access` (scoped packages publish as
 *      restricted by default, so a missing value fails the first publish),
 *   3. every file the manifest points at (`main`, `module`, `types`, `bin`, and
 *      every non-pattern `exports` target) is inside the tarball, plus any extra
 *      runtime assets named with `--require` (e.g. `dist/stubs` for the CLI),
 *   4. the package.json version is not already published on npm.
 *
 * The consumer smoke test (consumer-smoke-test.ts) proves the artifact WORKS;
 * this lint catches the publish mistakes that only show up on release day.
 *
 * LOCAL INVOCATION
 * ----------------
 *   bun scripts/publish-hygiene.ts --dir /path/to/packages/cli --require dist/stubs
 *   bun scripts/publish-hygiene.ts --skip-npm      # offline: skip check 4
 *
 * Exits non-zero listing every violation found.
 */

import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface Manifest {
	name: string;
	version?: string;
	main?: string;
	module?: string;
	types?: string;
	bin?: string | Record<string, string>;
	exports?: unknown;
	publishConfig?: { access?: string };
}

function isObject(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === "object" && !Array.isArray(v);
}

function isSubpathMap(keys: string[]): boolean {
	return keys.some((k) => k === "." || k.startsWith("./"));
}

/** Check 1: `"types"` first and `"default"` present in every condition block. */
export function conditionViolations(node: unknown, path = "exports"): string[] {
	if (!isObject(node)) return [];
	const keys = Object.keys(node);
	const problems: string[] = [];
	if (!isSubpathMap(keys)) {
		if (keys.includes("types") && keys[0] !== "types") {
			problems.push(`${path}: "types" must be the first condition (found after ${JSON.stringify(keys.slice(0, keys.indexOf("types")))})`);
		}
		if (!keys.includes("default")) {
			problems.push(`${path}: no "default" condition; resolvers that match no other condition get nothing`);
		}
	}
	for (const [key, value] of Object.entries(node)) {
		if (key === "./package.json") continue;
		problems.push(...conditionViolations(value, `${path}[${JSON.stringify(key)}]`));
	}
	return problems;
}

/** Check 2: scoped packages must set `publishConfig.access`. */
export function accessViolations(manifest: Manifest): string[] {
	if (!manifest.name.startsWith("@")) return [];
	if (manifest.publishConfig?.access) return [];
	return [`${manifest.name} is scoped but publishConfig.access is not set (npm defaults scoped packages to restricted)`];
}

function normalise(p: string): string {
	return p.replace(/^\.\//, "").replace(/\/+$/, "");
}

function exportTargets(node: unknown): string[] {
	if (typeof node === "string") return [node];
	if (!isObject(node)) return [];
	return Object.values(node).flatMap(exportTargets);
}

/** Every file the manifest points at, relative to the package root. Patterns (`*`) are skipped. */
export function referencedFiles(manifest: Manifest): string[] {
	const out = new Set<string>();
	for (const f of [manifest.main, manifest.module, manifest.types]) if (f) out.add(normalise(f));
	if (typeof manifest.bin === "string") out.add(normalise(manifest.bin));
	else if (isObject(manifest.bin)) for (const f of Object.values(manifest.bin)) out.add(normalise(f));
	for (const t of exportTargets(manifest.exports)) if (!t.includes("*")) out.add(normalise(t));
	return [...out];
}

/** Check 3: each required path is a packed file or a directory containing packed files. */
export function missingFiles(required: string[], packed: string[]): string[] {
	return required.filter((r) => {
		const want = normalise(r);
		return !packed.some((f) => f === want || f.startsWith(`${want}/`));
	});
}

/** Check 4: the version must not already be on npm. `published` is null when the package was never published. */
export function versionViolations(name: string, version: string, published: string[] | null): string[] {
	if (published?.includes(version)) {
		return [`${name}@${version} is already published on npm; bump the version`];
	}
	return [];
}

async function publishedVersions(name: string): Promise<string[] | null> {
	const res = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}`);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`npm registry returned ${res.status} for ${name}`);
	const body = (await res.json()) as { versions?: Record<string, unknown> };
	return Object.keys(body.versions ?? {});
}

async function run(cmd: string[], cwd: string): Promise<string> {
	const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
	const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	if ((await proc.exited) !== 0) throw new Error(`${cmd.join(" ")} failed:\n${out}${err}`);
	return out;
}

/** Pack the package and list the files inside the tarball (paths relative to the package root). */
async function packedFiles(dir: string): Promise<string[]> {
	const dest = await mkdtemp(join(tmpdir(), "publish-hygiene-"));
	try {
		await run(["bun", "pm", "pack", "--destination", dest], dir);
		const tgz = (await readdir(dest)).find((f) => f.endsWith(".tgz"));
		if (!tgz) throw new Error(`bun pm pack produced no tarball in ${dest}`);
		const list = await run(["tar", "-tzf", join(dest, tgz)], dest);
		return list
			.split("\n")
			.filter(Boolean)
			.map((l) => l.replace(/^package\//, ""));
	} finally {
		await rm(dest, { recursive: true, force: true });
	}
}

async function main(): Promise<void> {
	const argv = process.argv.slice(2);
	let dir = process.cwd();
	let skipNpm = false;
	const required: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--dir") dir = resolve(argv[++i] ?? ".");
		else if (arg === "--require") required.push(...(argv[++i] ?? "").split(/[\s,]+/).filter(Boolean));
		else if (arg === "--skip-npm") skipNpm = true;
		else if (arg === "--help" || arg === "-h") {
			console.log("usage: bun scripts/publish-hygiene.ts [--dir <pkg-dir>] [--require <path>]... [--skip-npm]");
			process.exit(0);
		} else throw new Error(`unknown argument: ${arg}`);
	}

	const manifest = (await Bun.file(join(dir, "package.json")).json()) as Manifest;
	console.log(`package: ${manifest.name}@${manifest.version}`);

	const problems: string[] = [];
	problems.push(...conditionViolations(manifest.exports));
	problems.push(...accessViolations(manifest));

	const packed = await packedFiles(dir);
	for (const f of missingFiles([...referencedFiles(manifest), ...required], packed)) {
		problems.push(`${f} is referenced or required but is not in the packed tarball (check "files" and the build)`);
	}

	if (!manifest.version) problems.push("package.json has no version");
	else if (!skipNpm) problems.push(...versionViolations(manifest.name, manifest.version, await publishedVersions(manifest.name)));

	if (problems.length > 0) {
		console.error(`\n::error::publish hygiene failed for ${manifest.name}`);
		for (const p of problems) console.error(`  - ${p}`);
		process.exit(1);
	}
	console.log(`publish hygiene PASSED (${packed.length} packed files${skipNpm ? ", npm check skipped" : ""})`);
}

if (import.meta.main) await main();
