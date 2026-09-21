export const LEARNER_AVATAR_COUNT = 36;

export const LEARNER_AVATARS = Array.from({ length: LEARNER_AVATAR_COUNT }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    key: `avatar-${number}`,
    src: `/avatars/avatar-${number}.png`,
    label: `Avatar ${number}`,
  };
});

export const DEFAULT_LEARNER_AVATAR_BACKGROUND_KEY = 'cream';

export const LEARNER_AVATAR_BACKGROUNDS = [
  { key: 'cream', label: 'Crema', color: '#F3E8D8', textColor: '#18221F' },
  { key: 'orange', label: 'Arancio', color: '#F2A07B', textColor: '#18221F' },
  { key: 'terracotta', label: 'Terracotta', color: '#C9795A', textColor: '#18221F' },
  { key: 'mustard', label: 'Senape', color: '#D9B45C', textColor: '#18221F' },
  { key: 'sage', label: 'Salvia', color: '#A9BDA9', textColor: '#18221F' },
  { key: 'dusty-blue', label: 'Azzurro polvere', color: '#A8BDCA', textColor: '#18221F' },
  { key: 'rose', label: 'Rosa polvere', color: '#D7A3AD', textColor: '#18221F' },
  { key: 'navy', label: 'Navy', color: '#26384A', textColor: '#FFFFFF' },
];

const learnerAvatarByKey = new Map(LEARNER_AVATARS.map((avatar) => [avatar.key, avatar]));
const learnerAvatarBackgroundByKey = new Map(
  LEARNER_AVATAR_BACKGROUNDS.map((background) => [background.key, background]),
);

export function isLearnerAvatarKey(value) {
  return learnerAvatarByKey.has(String(value || ''));
}

export function getLearnerAvatar(value) {
  return learnerAvatarByKey.get(String(value || '')) || null;
}

export function isLearnerAvatarBackgroundKey(value) {
  return learnerAvatarBackgroundByKey.has(String(value || ''));
}

export function getLearnerAvatarBackground(value) {
  return learnerAvatarBackgroundByKey.get(String(value || ''))
    || learnerAvatarBackgroundByKey.get(DEFAULT_LEARNER_AVATAR_BACKGROUND_KEY);
}
