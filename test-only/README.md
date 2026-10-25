# WaHueLaPa TEST-only files

This folder is preserved during the manual LIVE → TEST synchronization.

- `test-only/overrides/` mirrors paths in the repository. After syncing LIVE, its files overwrite the matching TEST paths.
- Example: `test-only/overrides/src/cloud-config.js` overwrites `src/cloud-config.js`.
- Never store service-role keys, database passwords, or other secrets here.
- `.github/`, `test-only/`, `TESTSERVER.md`, and `src/cloud-config.js` are also excluded from deletion and replacement by the sync.

**Safety:** use a separate Supabase project or local backend for TEST. The sync checks and refuses the known production Supabase URL and LIVE redirect URL. It does not copy database contents or deploy Edge Functions.

**Run:** Test repository → Actions → **Sync LIVE to TEST (manual)** → Run workflow (main).

**Important:** The sync updates the test `main` branch, overwriting ordinary test-side code changes. Preserve experiments in feature branches or in explicit test-only overrides. Production is never modified. If branch protection blocks pushes, update permissions or use a PR-based sync design instead.
