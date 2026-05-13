export const colors = {
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  border: '#222222',
  text: '#ffffff',
  textMuted: '#888888',
  textDim: '#666666',
  accent: '#60a5fa',
  positive: '#4ade80',
  negative: '#f87171',
} as const;

export type ColorKey = keyof typeof colors;
