export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Two palettes built on one rule: neutrals carry the interface, MTN yellow is
 * reserved for the primary action on a screen and for brand marks.
 *
 * `primary` is a fill colour. Anywhere yellow would sit on a surface as text
 * or an icon, use `accent`, which is tuned for contrast per scheme (bright
 * yellow on white fails WCAG).
 *
 * Every surface is a flat fill: no gradients, glows or coloured shadows.
 * Depth comes from borders and one restrained neutral card shadow.
 */
export const lightColors = {
  background: '#F5F6F8',
  backgroundSecondary: '#EEF0F3',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F7F8FA',

  primary: '#FFCB05',
  onPrimary: '#14161B',
  primaryDark: '#E5B500',
  primaryMuted: 'rgba(255, 203, 5, 0.18)',
  primaryFaint: 'rgba(255, 203, 5, 0.09)',
  accent: '#8A6A00',

  /** Dark brand surface (wallet card, logo tile) used in both schemes. */
  ink: '#14171E',
  onInk: '#FFFFFF',

  text: '#12151C',
  textSecondary: '#4B5262',
  textMuted: '#8B92A1',

  success: '#12805C',
  successMuted: 'rgba(18, 128, 92, 0.10)',
  error: '#C8322A',
  errorMuted: 'rgba(200, 50, 42, 0.08)',
  warning: '#B25E09',
  warningMuted: 'rgba(178, 94, 9, 0.10)',
  info: '#2563C9',
  infoMuted: 'rgba(37, 99, 201, 0.09)',

  border: '#E6E8EC',
  borderStrong: '#D3D7DE',
  overlay: 'rgba(18, 21, 28, 0.45)',

  /** Flat fills for the envelope illustration. */
  envelopeBody: '#FFFFFF',
  envelopeFlap: '#F1F2F5',
  envelopeOutline: '#C9CED7',
};

export type Palette = typeof lightColors;

export const darkColors: Palette = {
  background: '#0C0E12',
  backgroundSecondary: '#111419',
  surface: '#15181E',
  surfaceElevated: '#1B1F27',
  surfaceMuted: '#12151A',

  primary: '#FFCB05',
  onPrimary: '#14161B',
  primaryDark: '#E5B500',
  primaryMuted: 'rgba(255, 203, 5, 0.14)',
  primaryFaint: 'rgba(255, 203, 5, 0.07)',
  accent: '#FFCB05',

  ink: '#1F232C',
  onInk: '#FFFFFF',

  text: '#F3F4F6',
  textSecondary: '#A3A9B6',
  textMuted: '#6B7280',

  success: '#34C38F',
  successMuted: 'rgba(52, 195, 143, 0.12)',
  error: '#F26B63',
  errorMuted: 'rgba(242, 107, 99, 0.12)',
  warning: '#F2A93B',
  warningMuted: 'rgba(242, 169, 59, 0.12)',
  info: '#6AA5FF',
  infoMuted: 'rgba(106, 165, 255, 0.12)',

  border: '#23272F',
  borderStrong: '#2E333D',
  overlay: 'rgba(0, 0, 0, 0.6)',

  envelopeBody: '#2A2F39',
  envelopeFlap: '#343A46',
  envelopeOutline: '#4A5160',
};

export type StatusKey =
  | 'waiting'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'expired'
  | 'failed';

export const makeStatusColors = (c: Palette): Record<StatusKey, { fg: string; bg: string }> => ({
  waiting: { fg: c.accent, bg: c.primaryMuted },
  claimed: { fg: c.info, bg: c.infoMuted },
  processing: { fg: c.warning, bg: c.warningMuted },
  completed: { fg: c.success, bg: c.successMuted },
  expired: { fg: c.textMuted, bg: c.backgroundSecondary },
  failed: { fg: c.error, bg: c.errorMuted },
});

export const makeShadows = (scheme: 'light' | 'dark') => ({
  /** Resting card elevation: barely there in light mode, absent in dark. */
  card: {
    shadowColor: '#0B0D12',
    shadowOpacity: scheme === 'dark' ? 0 : 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: scheme === 'dark' ? 0 : 1,
  },
});
