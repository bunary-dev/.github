import { describe, expect, test } from "bun:test";
import { missingOptionalPeers } from "./optional-peers.ts";

describe("missingOptionalPeers", () => {
	test("returns optional peers the consumer doesn't have, at their declared range", () => {
		const manifest = {
			peerDependencies: { "@bunary/core": "^0.4.0" },
			peerDependenciesMeta: { "@bunary/core": { optional: true } },
		};
		expect(missingOptionalPeers(manifest, {})).toEqual(["@bunary/core@^0.4.0"]);
	});

	test("skips a peer the consumer already has (e.g. installed from vendor/)", () => {
		const manifest = {
			peerDependencies: { "@bunary/core": "^0.4.0" },
			peerDependenciesMeta: { "@bunary/core": { optional: true } },
		};
		expect(missingOptionalPeers(manifest, { "@bunary/core": "file:../vendor/bunary-core-0.4.0.tgz" })).toEqual([]);
	});

	test("ignores required peers and peers without meta", () => {
		const manifest = {
			peerDependencies: { "@bunary/core": "^0.4.0", typescript: "^7", "drizzle-orm": "^0.45.0" },
			peerDependenciesMeta: { "@bunary/core": { optional: true }, "drizzle-orm": { optional: false } },
		};
		expect(missingOptionalPeers(manifest, {})).toEqual(["@bunary/core@^0.4.0"]);
	});

	test("a package with no peers needs nothing", () => {
		expect(missingOptionalPeers({}, {})).toEqual([]);
		expect(missingOptionalPeers({ peerDependencies: {} }, { a: "1" })).toEqual([]);
	});

	test("an optional meta entry without a matching peer range is ignored", () => {
		expect(missingOptionalPeers({ peerDependenciesMeta: { x: { optional: true } } }, {})).toEqual([]);
	});
});
