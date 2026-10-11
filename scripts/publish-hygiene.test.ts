import { describe, expect, test } from "bun:test";
import {
	accessViolations,
	conditionViolations,
	missingFiles,
	referencedFiles,
	versionViolations,
} from "./publish-hygiene.ts";

describe("conditionViolations", () => {
	test("clean map passes", () => {
		expect(
			conditionViolations({
				".": { types: "./dist/index.d.ts", import: "./dist/index.js", default: "./dist/index.js" },
				"./package.json": "./package.json",
			}),
		).toEqual([]);
	});

	test("types after import is flagged", () => {
		const v = conditionViolations({ ".": { import: "./a.js", types: "./a.d.ts", default: "./a.js" } });
		expect(v).toHaveLength(1);
		expect(v[0]).toContain('"types"');
	});

	test("missing default is flagged", () => {
		const v = conditionViolations({ ".": { types: "./a.d.ts", import: "./a.js" } });
		expect(v).toHaveLength(1);
		expect(v[0]).toContain('"default"');
	});

	test("conditions-only root map is checked", () => {
		expect(conditionViolations({ import: "./a.js", types: "./a.d.ts" })).toHaveLength(2);
	});

	test("nested condition blocks are checked", () => {
		const v = conditionViolations({
			".": { types: "./a.d.ts", bun: { import: "./b.js" }, default: "./a.js" },
		});
		expect(v.some((m) => m.includes('"bun"'))).toBe(true);
	});

	test("absent or string exports pass", () => {
		expect(conditionViolations(undefined)).toEqual([]);
		expect(conditionViolations("./index.js")).toEqual([]);
	});
});

describe("accessViolations", () => {
	test("scoped without publishConfig.access is flagged", () => {
		expect(accessViolations({ name: "@bunary/core" })).toHaveLength(1);
	});
	test("scoped with access passes", () => {
		expect(accessViolations({ name: "@bunary/core", publishConfig: { access: "public" } })).toEqual([]);
	});
	test("unscoped needs nothing", () => {
		expect(accessViolations({ name: "bunary" })).toEqual([]);
	});
});

describe("referencedFiles", () => {
	test("collects main, module, types, bin and exports targets, skipping patterns", () => {
		const files = referencedFiles({
			name: "@bunary/x",
			main: "./dist/index.js",
			module: "./dist/index.js",
			types: "./dist/index.d.ts",
			bin: { x: "./dist/cli.js" },
			exports: {
				".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
				"./sub": { types: "./dist/sub.d.ts", default: "./dist/sub.js" },
				"./*": "./dist/*.js",
				"./package.json": "./package.json",
			},
		});
		expect(files.sort()).toEqual(
			["dist/cli.js", "dist/index.d.ts", "dist/index.js", "dist/sub.d.ts", "dist/sub.js", "package.json"].sort(),
		);
	});

	test("string bin is collected", () => {
		expect(referencedFiles({ name: "x", bin: "./cli.js" })).toEqual(["cli.js"]);
	});
});

describe("missingFiles", () => {
	const packed = ["package.json", "dist/index.js", "dist/stubs/a.ts", "dist/stubs/b/c.ts"];
	test("exact files and directory prefixes are found", () => {
		expect(missingFiles(["dist/index.js", "dist/stubs", "dist/stubs/b"], packed)).toEqual([]);
	});
	test("absent paths are reported", () => {
		expect(missingFiles(["dist/index.d.ts", "dist/stub"], packed)).toEqual(["dist/index.d.ts", "dist/stub"]);
	});
	test("leading ./ and trailing / are ignored", () => {
		expect(missingFiles(["./dist/stubs/"], packed)).toEqual([]);
	});
});

describe("versionViolations", () => {
	test("unpublished package passes", () => {
		expect(versionViolations("@bunary/x", "1.0.0", null)).toEqual([]);
	});
	test("new version passes", () => {
		expect(versionViolations("@bunary/x", "1.0.1", ["1.0.0"])).toEqual([]);
	});
	test("already-published version is flagged", () => {
		expect(versionViolations("@bunary/x", "1.0.0", ["0.9.0", "1.0.0"])).toHaveLength(1);
	});
});
