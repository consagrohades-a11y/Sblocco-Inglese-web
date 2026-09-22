# AGENTS.md

Project-wide operating rules for AI coding agents working on Sblocco Inglese.

## Deployment discipline

Vercel build capacity is a constrained project resource. Do **not** use one Vercel deployment per intermediate commit.

Default workflow:

1. Work on a feature branch.
2. Commit as needed, but treat GitHub Actions as the normal validation loop.
3. Run/require repository validation and build checks before release.
4. Do **not** intentionally trigger a Vercel preview for every intermediate commit.
5. Create or use **one preview deployment at a meaningful verification milestone**, normally when the change set is ready for visual/product QA.
6. Prefer validating the already-built preview and then **promoting the same artifact to production** instead of rebuilding it.
7. For docs-only, SQL-only, test-only, or other changes that do not affect the deployed frontend/runtime artifact, skip Vercel builds whenever the project configuration allows it.
8. Do not use `--force` or cache-bypassing deploys unless there is a concrete cache/build problem.
9. If a feature requires many small remote commits, group deploy-worthy work into a final milestone rather than letting each commit consume a build.
10. If Vercel reports a build-rate limit, stop generating additional deployments. Continue validation through GitHub Actions/local build and reuse the latest READY preview when safe.

Target pattern:

```text
intermediate commit -> GitHub checks
intermediate commit -> GitHub checks
intermediate commit -> GitHub checks
release candidate   -> one Vercel preview
validated preview   -> promote to production
```

Avoid:

```text
commit -> Vercel build
commit -> Vercel build
commit -> Vercel build
commit -> Vercel build
merge  -> another Vercel build
```

## Release safety

- Before merge/release, run the repository build and relevant validation scripts.
- Database schema changes must be new timestamped Supabase migrations; never rewrite applied migrations.
- A production deployment should correspond to a reviewed/validated release candidate, not an arbitrary intermediate commit.
- Prefer small, targeted code diffs, but **small code commits do not imply small deployment increments**.
