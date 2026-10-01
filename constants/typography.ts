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

export const type = {
  greeting: {
    fontFamily: fontFamily.medium,
    fontSize: 21,
    lineHeight: 28,
  } satisfies TypeStyle,
  balanceLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  } satisfies TypeStyle,
  balanceValue: {
    fontFamily: fontFamily.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1,
  } satisfies TypeStyle,
  heroLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
  } satisfies TypeStyle,
  heroAmount: {
    fontFamily: fontFamily.extrabold,
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -2,
  } satisfies TypeStyle,
  amount: {
    fontFamily: fontFamily.extrabold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
  } satisfies TypeStyle,
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.2,
  } satisfies TypeStyle,
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
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
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.8,
  } satisfies TypeStyle,
  numeric: {
    fontFamily: fontFamily.extrabold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1.5,
  } satisfies TypeStyle,
} as const;

export type TypeToken = keyof typeof type;
