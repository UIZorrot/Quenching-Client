# MOD successive ZIP updates (schema 3)

2026-10-09: user-approved separation. MOD official resource releases use one ordinary ZIP per successive release. Client EXE/ASAR and assets keep the tested schema 2 file-sync updater. A client-only release must not increment the MOD version or create an empty resource patch.

## Player flow

1. Automatic checks read the signed website index and selected branch `_patch/keep.que` only. Legacy 3.4 detection still uses the three known directories. No directory-wide scan and no requirement to match an official installation exactly.
2. The existing combined confirmation displays current/latest MOD and client versions. Confirm once; MOD finishes before client update starts.
3. For MOD 3.5 → 3.7, download/apply the immutable 3.5 → 3.6 ZIP, then the 3.6 → 3.7 ZIP. Each step contains all changed files for that official transition; no EXE-style binary base requirement.
4. Each ZIP is authenticated by signed size/SHA-256, and its payload is verified against its included official target inventory. This verifies downloaded publisher data, not the player's old files.
5. Existing affected files in `QMoff` stay there. Extra player files, unchanged/missing files and the other branch are not scanned or cleaned. Explicit deleted paths are removed only when that specific file matches a known official retired hash; never remove a whole resource directory.
6. Each step backs up affected files, installs, then commits inventory/`keep.que`/installed state. A failed step rolls back itself. Previously committed steps remain valid; after reaching 3.6 then failing at 3.7, retry starts at 3.6. The selected profile is reapplied even when earlier steps succeeded but a later step failed. Progress reaches 100 only when all steps complete.

The website controls `maxPatchSteps` (default 6). Count actual published transitions, not numeric subtraction of version/sequence. A missing chain or exceeding this policy directs the player to the manual full package. The updater does not automatically download a full package.

## Website index

Production: `/api/quenching/mod-zip-manifest.json` and `/quenching/mod-zip-manifest.json`, identical signed bytes. The new client prefers these before the existing schema 2/1 MOD endpoints. Keep existing endpoints/artifact URLs for already distributed old clients; they cannot learn this new format from a server change alone.

Independent test base: `mod-zip-manifest.json`, then legacy `mod-sync-manifest.json` fallback. The existing portable test flag, isolated settings and client test index remain unchanged. Do not deploy to production or alter `version.que` merely to exercise local tests.

```json
{
  "schema": 3,
  "product": "quenching-mod",
  "sequence": 37,
  "version": "3.7",
  "displayVersion": "3.7",
  "maxPatchSteps": 6,
  "githubMirrors": ["https://gh-proxy.com/", "https://gh-proxy.org/", "https://ghfast.top/"],
  "patches": [
    {
      "fromSequence": 35, "toSequence": 36,
      "fromVersion": "3.5", "version": "3.6", "displayVersion": "3.6",
      "size": 12345, "sha256": "<actual ZIP SHA-256>",
      "sources": ["https://github.com/UIZorrot/Quenching-Assets/releases/download/full-package-3.6/QMF3.5-to-3.6.zip"]
    },
    {
      "fromSequence": 36, "toSequence": 37,
      "fromVersion": "3.6", "version": "3.7", "displayVersion": "3.7",
      "size": 23456, "sha256": "<actual ZIP SHA-256>",
      "sources": ["https://github.com/UIZorrot/Quenching-Assets/releases/download/full-package-3.7/QMF3.6-to-3.7.zip"]
    }
  ],
  "signature": {"algorithm": "ed25519", "keyId": "<release key ID>", "value": "<signature>"}
}
```

This is a schema example, not a publishable manifest. Mirrors are signed website policy, not hardcoded client sources. Retain HTTPS/signature/hash checking; existing 15-second slow-source fallback is reused. Failed GitLawb/Irys are not required. R2 is not automatically activated or considered verified by this change.

## ZIP and private publisher

An automatic update ZIP has `patch.json`, `inventory.json.gz`, and `payload/<resource paths>`. It is an ordinary independently readable ZIP, not a split-volume archive. **Do not instruct players to unpack this automatic ZIP directly into the game root.** A manual difference/overlay ZIP has resource paths at its root and must be generated separately with English instructions. Full A/B remain ordinary standalone ZIP archives, both needed for the complete payload.

`patch.json` contains schema 1, product, exact from/to sequence and fromVersion/version, changed records (`path`, `size`, `sha256`) and explicit deletion records (`path`, `acceptedPreviousSha256`). The inventory is the complete target *official* list, not a player-directory consistency demand.

Private publisher (ignored `_irys`, credentials never public):

```text
node --import tsx _irys/build-mod-zip.ts
  --from previous-official.files.json.gz
  --to target-official.files.json.gz
  --root D:/Quenching/QM/Latest
  --output new-candidate-directory
  --chain previous-mod-zip-manifest.json
  --url-base https://github.com/UIZorrot/Quenching-Assets/releases/download/IMMUTABLE_TAG/
  --github-mirror https://gh-proxy.com/
  --github-mirror https://gh-proxy.org/
  --github-mirror https://ghfast.top/
  --private-key private-existing-signing-key-path
```

First migration omits `--chain`. Later releases pass the previous signed schema 3 index, retain supported older ZIP URLs and append only the new transition. Optional `--max-patch-steps` / `--key-id`. Output: one `QMF<from>-to-<to>.zip`, signed `mod-zip-manifest.json`, private `publish-report.json`. Upload only the ZIP to Release; deploy the manifest to the website. No hundreds of file objects/snapshots uploaded by this publisher. It does not upload or deploy, does not modify source assets, refuses an existing candidate directory, and verifies all changed publisher inputs against the frozen target snapshot.

Production MOD resources have one source: `D:/Quenching/QM/Latest`. Prepare inventories with `_irys/prepare-mod-latest.ts`; do not copy a frozen `mod-root` or use a historical resource tree to fill files intentionally removed from Latest. Historical snapshots remain comparison metadata, not content authority. `--fixture` is only for isolated publisher tests. Full A/B packaging also reads Latest directly and uses the generated candidate metadata. See `.agents/skills/quenching-release/references/latest-source.md`.

ZIP files placed directly in the Latest root are distribution artifacts and are excluded from resource inventories; they are not deleted. Nested ZIPs remain eligible resource inputs. This prevents a full-package archive being repackaged inside itself. Resource edits or removals in Latest remain pending changes until a new version is prepared and published; the existing `keep.que` does not make those working bytes identical to the last release.

Use private historical snapshots, not a player's configured tree. Reusing an official version with different bytes is still prohibited. Only retain ZIP transitions inside the intended support window in future indices; do not delete remote artifacts still referenced by old signed manifests without a separate compatibility review.

## Code and acceptance

- `src/shared/mod-zip-update.ts`: index policy validation, exact sequential path, step-count limit.
- `src/Main/services/mod-update-service.ts`: signature/gate, ZIP download with existing mirrors, payload verification, per-step transaction, progress and resume.
- `src/Main/services/mod-integrity-service.ts`: supports ordinal inventories and legacy transmitted ordering across languages.
- `src/Main/ipc/mod-update-handlers.ts`: reapplies current profile after committed steps, including partial chains.
- `_irys/build-mod-zip.ts`: private ZIP + signature generation.
- `scripts/test-mod-zip.ts`: real service, real private publisher, local HTTP and temporary installs; no real game/client GUI.

2026-10-09 isolated acceptance passed: 3.5 → 3.6 → 3.7, non-arithmetic sequence 36 → 80, only-marker checking, no old local inventory, missing/modified unchanged resources, QMoff placement, official-only deletion, player extra files, PTR/other branch preservation, first-source 404 fallback, partial rollback/retry, payload corruption, archive hash, signed policy tampering and excessive/missing chain. Existing schema 1/2 and client regression passed separately. This is source/tool acceptance, not official upload, website deployment or user game acceptance of a newly built package.

Real local candidate: `_irys/releases/mod-zip-3.6-20261009/QMF3.5-to-3.6.zip`, 33,673,628 bytes, SHA-256 `41e93b3f9d1c0ef6d7a0e203a2afce31128f456f21a292bfa174432d7d4e9bc7`. Derived from frozen formal 3.5/3.6 snapshots and the formal 3.6 resource root (not a modified player install). 86 changed payload files and one explicit retirement, complete official target inventory 9,069 records. `_irys/verify-mod-zip.ts` verified signature with the existing client public key, all ZIP payload hashes and complete changed/deleted coverage against the official snapshots. `verification.json` and `publish-report.json` remain private. Its intended new Release URL is not uploaded yet; do not deploy its index until uploading and validating that URL. New runtime source still needs inclusion in the final portable client package; the previously user-tested package is preserved as-is.
