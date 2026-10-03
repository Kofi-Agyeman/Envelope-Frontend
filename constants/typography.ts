export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  fontWeight?: '400' | '500' | '600' | '700' | '800' | '900';
};

/**
 * One type scale for the whole app. Weight does the hierarchy work, so sizes
 * stay restrained; money is the only thing that is allowed to be large.
 */
export const type = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
  } satisfies TypeStyle,
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  } satisfies TypeStyle,
  greeting: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  } satisfies TypeStyle,
  balanceLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TypeStyle,
  balanceValue: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  } satisfies TypeStyle,
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
  } satisfies TypeStyle,
  heroLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
  } satisfies TypeStyle,
  heroAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1.6,
  } satisfies TypeStyle,
  amount: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  } satisfies TypeStyle,
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  } satisfies TypeStyle,
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  } satisfies TypeStyle,
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  } satisfies TypeStyle,
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
  } satisfies TypeStyle,
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TypeStyle,
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  } satisfies TypeStyle,
  button: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.1,
  } satisfies TypeStyle,
  numeric: {
    fontFamily: fontFamily.bold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.2,
  } satisfies TypeStyle,
} as const;

export type TypeToken = keyof typeof type;

/** Aligns digits in columns of money so amounts do not jitter as they change. */
export const tabularNums = { fontVariant: ['tabular-nums'] as ['tabular-nums'] };
