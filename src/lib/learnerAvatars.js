export const LEARNER_AVATAR_COUNT = 36;

export const LEARNER_AVATARS = Array.from({ length: LEARNER_AVATAR_COUNT }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    key: `avatar-${number}`,
    src: `/avatars/avatar-${number}.png`,
    label: `Avatar ${number}`,
  };
});

const learnerAvatarByKey = new Map(LEARNER_AVATARS.map((avatar) => [avatar.key, avatar]));

export function isLearnerAvatarKey(value) {
  return learnerAvatarByKey.has(String(value || ''));
}

export function getLearnerAvatar(value) {
  return learnerAvatarByKey.get(String(value || '')) || null;
}
