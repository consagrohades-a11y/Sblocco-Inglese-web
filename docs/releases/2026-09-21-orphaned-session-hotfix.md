# Orphaned auth-session hotfix | 21 September 2026

This documentation-only release marker triggers the production deployment for the orphaned-session fix merged in PR #258.

Runtime change already merged before this marker:
- clear browser sessions whose authenticated user no longer has a profile;
- redirect invalid admin-route sessions to login instead of leaving the UI in a half-authenticated state.

No additional runtime behavior is introduced by this marker.
