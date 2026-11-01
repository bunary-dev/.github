/** The parts of a package.json this module reads. */
export interface PeerManifest {
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

/**
 * Optional peers of the package under test that the consumer project doesn't
 * have yet, as `name@range` specs to install from npm.
 *
 * Vendored tarballs are installed first and win: anything already in the
 * consumer's dependencies is skipped. Required peers are left alone (a consumer
 * must bring those itself), so only `peerDependenciesMeta[name].optional === true`
 * peers are returned.
 *
 * @example
 * missingOptionalPeers(
 *   { peerDependencies: { "@bunary/core": "^0.4.0" }, peerDependenciesMeta: { "@bunary/core": { optional: true } } },
 *   {},
 * ); // ["@bunary/core@^0.4.0"]
 */
export function missingOptionalPeers(manifest: PeerManifest, installed: Record<string, string>): string[] {
	const peers = manifest.peerDependencies ?? {};
	const meta = manifest.peerDependenciesMeta ?? {};
	return Object.entries(peers)
		.filter(([name]) => meta[name]?.optional === true && !(name in installed))
		.map(([name, range]) => `${name}@${range}`);
}
