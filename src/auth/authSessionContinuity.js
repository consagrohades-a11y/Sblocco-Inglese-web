// Keep a verified authenticated view mounted across harmless Supabase auth refresh events.
export function canKeepAuthenticatedView(event, nextUserId, profileOwnerId) {
  return Boolean(nextUserId && nextUserId === profileOwnerId)
    && ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event);
}
