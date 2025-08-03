export interface ProfileIcon {
  id: string;
  emoji: string;
  name: string;
  category: 'animals' | 'faces' | 'objects' | 'nature';
}

export const PROFILE_ICONS: ProfileIcon[] = [
  // Animals
  { id: 'cat', emoji: '🐱', name: 'Cat', category: 'animals' },
  { id: 'dog', emoji: '🐶', name: 'Dog', category: 'animals' },
  { id: 'fox', emoji: '🦊', name: 'Fox', category: 'animals' },
  { id: 'wolf', emoji: '🐺', name: 'Wolf', category: 'animals' },
  { id: 'bear', emoji: '🐻', name: 'Bear', category: 'animals' },
  { id: 'panda', emoji: '🐼', name: 'Panda', category: 'animals' },
  { id: 'lion', emoji: '🦁', name: 'Lion', category: 'animals' },
  { id: 'tiger', emoji: '🐯', name: 'Tiger', category: 'animals' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn', category: 'animals' },
  { id: 'dragon', emoji: '🐉', name: 'Dragon', category: 'animals' },

  // Faces
  { id: 'smile', emoji: '😊', name: 'Smile', category: 'faces' },
  { id: 'cool', emoji: '😎', name: 'Cool', category: 'faces' },
  { id: 'star_eyes', emoji: '🤩', name: 'Star Eyes', category: 'faces' },
  { id: 'thinking', emoji: '🤔', name: 'Thinking', category: 'faces' },
  { id: 'ninja', emoji: '🥷', name: 'Ninja', category: 'faces' },
  { id: 'robot', emoji: '🤖', name: 'Robot', category: 'faces' },
  { id: 'alien', emoji: '👽', name: 'Alien', category: 'faces' },
  { id: 'ghost', emoji: '👻', name: 'Ghost', category: 'faces' },

  // Objects
  { id: 'rocket', emoji: '🚀', name: 'Rocket', category: 'objects' },
  { id: 'gem', emoji: '💎', name: 'Gem', category: 'objects' },
  { id: 'crown', emoji: '👑', name: 'Crown', category: 'objects' },
  { id: 'trophy', emoji: '🏆', name: 'Trophy', category: 'objects' },
  { id: 'fire', emoji: '🔥', name: 'Fire', category: 'objects' },
  { id: 'lightning', emoji: '⚡', name: 'Lightning', category: 'objects' },
  { id: 'star', emoji: '⭐', name: 'Star', category: 'objects' },
  { id: 'magic', emoji: '✨', name: 'Magic', category: 'objects' },

  // Nature
  { id: 'tree', emoji: '🌳', name: 'Tree', category: 'nature' },
  { id: 'flower', emoji: '🌸', name: 'Flower', category: 'nature' },
  { id: 'sunflower', emoji: '🌻', name: 'Sunflower', category: 'nature' },
  { id: 'cactus', emoji: '🌵', name: 'Cactus', category: 'nature' },
  { id: 'mushroom', emoji: '🍄', name: 'Mushroom', category: 'nature' },
  { id: 'sun', emoji: '☀️', name: 'Sun', category: 'nature' },
  { id: 'moon', emoji: '🌙', name: 'Moon', category: 'nature' },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow', category: 'nature' },
];

export const ICON_CATEGORIES = {
  animals: 'Animals',
  faces: 'Faces',
  objects: 'Objects',
  nature: 'Nature',
} as const;

export const DEFAULT_PROFILE_ICON = 'smile';

export function getProfileIcon(iconId: string): ProfileIcon | null {
  return PROFILE_ICONS.find(icon => icon.id === iconId) || null;
}

export function getProfileIconsByCategory(category: ProfileIcon['category']): ProfileIcon[] {
  return PROFILE_ICONS.filter(icon => icon.category === category);
}