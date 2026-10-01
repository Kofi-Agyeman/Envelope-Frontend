export const colors = {
  background: '#090A0F',
  backgroundSecondary: '#10121A',
  surface: '#171923',
  surfaceElevated: '#1D2030',

  primary: '#FFD21C',
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
} as const;

export type StatusKey =
  | 'waiting'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'expired'
  | 'failed';

export const statusColors: Record<StatusKey, { fg: string; bg: string }> = {
  waiting: { fg: colors.primary, bg: colors.primaryMuted },
  claimed: { fg: colors.info, bg: colors.infoMuted },
  processing: { fg: colors.warning, bg: colors.warningMuted },
  completed: { fg: colors.success, bg: colors.successMuted },
  expired: { fg: colors.textMuted, bg: 'rgba(255,255,255,0.06)' },
  failed: { fg: colors.error, bg: colors.errorMuted },
};

export const gradients = {
  hero: ['#1E2130', '#14161F'] as const,
  envelopeBody: ['#262A3B', '#171A26'] as const,
  envelopeFlap: ['#2E3346', '#1C2030'] as const,
  primaryButton: ['#FFD21C', '#E8B800'] as const,
  primaryButtonPressed: ['#E8B800', '#CFA000'] as const,
  envelopeSeal: ['#FFE066', '#D8AD00'] as const,
  screenFade: ['#10121A', '#090A0F'] as const,
};

export const shadows = {
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
} as const;
