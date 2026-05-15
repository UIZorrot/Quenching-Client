# Classic Mode Doc Sync

## Source Mapping

Requested `.agents` docs were not present on disk during scan. Current authoritative content exists in:

- `wiki/classic_mode_complete.md`
- `wiki/classic_mode_implementation.md`
- `wiki/classic_mode_progress.md`
- `wiki/workflows/add-feature-button.md`

## Sync Policy

1. Keep `wiki/` as source of truth unless team decides otherwise.
2. Keep `.agents/` as lightweight mirrors or index pages.
3. For each change, update both index and source map in the same commit.

## Suggested Ownership

- Feature developer updates workflow docs.
- Reviewer confirms path accuracy (especially preload entry and IPC registration file).
