// A token refresh (or a repeated sign-in notification for the same user) does
// not change the identity whose profile already authorised the mounted view.
export function canKeepAuthenticatedView(event, nextUserId, profileOwnerId) {
  return Boolean(nextUserId && nextUserId === profileOwnerId)
    && ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event);
}
