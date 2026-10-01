export type ThemeMode = 'light' | 'dark' | 'system';

export const lightColors = {
  background: '#F4F6FB',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  primary: '#B8860B',
  onPrimary: '#1A1500',
  primaryDark: '#8A6508',
  primaryMuted: 'rgba(184, 134, 11, 0.12)',
  primaryFaint: 'rgba(184, 134, 11, 0.06)',

  text: '#101425',
  textSecondary: '#4E566B',
  textMuted: '#8A91A3',

  success: '#0F9D58',
  successMuted: 'rgba(15, 157, 88, 0.12)',
  error: '#D92D20',
  errorMuted: 'rgba(217, 45, 32, 0.10)',
  warning: '#B54708',
  warningMuted: 'rgba(181, 71, 8, 0.10)',
  info: '#0B6BCB',
  infoMuted: 'rgba(11, 107, 203, 0.10)',

  border: 'rgba(16, 20, 37, 0.10)',
  borderStrong: 'rgba(16, 20, 37, 0.18)',
  overlay: 'rgba(16, 20, 37, 0.45)',

  glow: 'rgba(184, 134, 11, 0.35)',
};

export const darkColors = {
  background: '#090A0F',
  backgroundSecondary: '#10121A',
  surface: '#171923',
  surfaceElevated: '#1D2030',

  primary: '#FFD21C',
  onPrimary: '#141621',
  primaryDark: '#D8AD00',
  primaryMuted: 'rgba(255, 210, 28, 0.14)',
  primaryFaint: 'rgba(255, 210, 28, 0.06)',

  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#5F6472',

  success: '#35D07F',
  successMuted: 'rgba(53, 208, 127, 0.14)',
  error: '#FF5C5C',
  errorMuted: 'rgba(255, 92, 92, 0.14)',
  warning: '#FFB020',
  warningMuted: 'rgba(255, 176, 32, 0.14)',
  info: '#5AB8FF',
  infoMuted: 'rgba(90, 184, 255, 0.14)',

  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  overlay: 'rgba(9,10,15,0.72)',

  glow: 'rgba(255, 210, 28, 0.30)',
};

export type Palette = typeof lightColors;

export type StatusKey =
  | 'waiting'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'expired'
  | 'failed';

export const makeStatusColors = (c: Palette): Record<StatusKey, { fg: string; bg: string }> => ({
  waiting: { fg: c.primary, bg: c.primaryMuted },
  claimed: { fg: c.info, bg: c.infoMuted },
  processing: { fg: c.warning, bg: c.warningMuted },
  completed: { fg: c.success, bg: c.successMuted },
  expired: { fg: c.textMuted, bg: c.border },
  failed: { fg: c.error, bg: c.errorMuted },
});

export const makeGradients = (scheme: 'light' | 'dark') =>
  scheme === 'dark'
    ? {
        hero: ['#1E2130', '#14161F'] as const,
        envelopeBody: ['#262A3B', '#171A26'] as const,
        envelopeFlap: ['#2E3346', '#1C2030'] as const,
        primaryButton: ['#FFD21C', '#E8B800'] as const,
        primaryButtonPressed: ['#E8B800', '#CFA000'] as const,
        envelopeSeal: ['#FFE066', '#D8AD00'] as const,
        screenFade: ['#10121A', '#090A0F'] as const,
      }
    : {
        hero: ['#FFFFFF', '#EFF1F8'] as const,
        envelopeBody: ['#FFFFFF', '#EDF0F8'] as const,
        envelopeFlap: ['#F2F4FB', '#DDE2F0'] as const,
        primaryButton: ['#F2C200', '#D9A400'] as const,
        primaryButtonPressed: ['#D9A400', '#BF8F00'] as const,
        envelopeSeal: ['#FFD84D', '#E0A800'] as const,
        screenFade: ['#FFFFFF', '#F4F6FB'] as const,
      };

export const makeShadows = (c: Palette, scheme: 'light' | 'dark') => ({
  soft: {
    shadowColor: '#000',
    shadowOpacity: scheme === 'dark' ? 0.35 : 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  glow: {
    shadowColor: c.primary,
    shadowOpacity: scheme === 'dark' ? 0.55 : 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});

