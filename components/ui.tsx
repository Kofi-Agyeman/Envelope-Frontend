import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { haptics } from '@/utils/haptics';

/**
 * Small layout primitives shared by every screen. Keeping card, list and
 * header styling in one place is what makes the screens read as one product.
 */

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { shadows } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.card, shadows.card, padded && styles.cardPadded, style]}>
      {children}
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.screenHeader}>
      <View style={styles.flex}>
        <Text style={styles.screenTitle} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="link"
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Uppercase label above a grouped list, as in iOS settings. */
export function GroupLabel({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.groupLabel}>{children}</Text>;
}

export function IconTile({
  icon,
  color,
  background,
  size = 40,
}: {
  icon: IconName;
  color: string;
  background: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size * 0.45} color={color} strokeWidth={2} />
    </View>
  );
}

/** Card that holds a stack of rows separated by inset hairlines. */
export function ListGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  const styles = useThemedStyles(createStyles);
  return (
    <Card padded={false} style={[styles.listGroup, style]}>
      {items.map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <View style={styles.listDivider} /> : null}
          {child}
        </React.Fragment>
      ))}
    </Card>
  );
}

export function ListRow({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  value,
  trailing,
  onPress,
  destructive,
  accessibilityLabel,
}: {
  icon?: IconName;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  subtitle?: string;
  value?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const content = (
    <>
      {icon ? (
        <IconTile
          icon={icon}
          size={34}
          color={iconColor ?? (destructive ? colors.error : colors.textSecondary)}
          background={iconBackground ?? (destructive ? colors.errorMuted : colors.backgroundSecondary)}
        />
      ) : null}
      <View style={styles.flex}>
        <Text
          style={[styles.rowTitle, destructive && { color: colors.error }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (
        <View style={styles.rowTrailing}>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          {onPress ? (
            <Icon name="chevronForward" size={16} color={colors.textMuted} />
          ) : null}
        </View>
      )}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.segment, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              haptics.light();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={[styles.segmentItem, selected && styles.segmentItemActive]}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size={14}
                color={selected ? colors.text : colors.textMuted}
              />
            ) : null}
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={styles.empty}>
      <IconTile icon={icon} size={48} color={colors.textSecondary} background={colors.backgroundSecondary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => [styles.emptyAction, pressed && { opacity: 0.8 }]}
        >
          <Icon name="plus" size={16} color={colors.onPrimary} strokeWidth={2.2} />
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

/** Centered, width-capped column used by every scrolling screen. */
export const screenContent: ViewStyle = {
  paddingHorizontal: layout.screenPadding,
  maxWidth: layout.maxContentWidth,
  width: '100%',
  alignSelf: 'center',
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardPadded: {
      padding: spacing.lg,
    },
    screenHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    screenTitle: {
      ...type.display,
      color: colors.text,
    },
    screenSubtitle: {
      ...type.caption,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...type.sectionTitle,
      color: colors.text,
    },
    sectionAction: {
      paddingVertical: spacing.xs,
    },
    sectionActionText: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.textSecondary,
    },
    groupLabel: {
      ...type.overline,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    listGroup: {
      overflow: 'hidden',
    },
    listDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 62,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 58,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    rowTitle: {
      ...type.bodyMedium,
      color: colors.text,
    },
    rowSubtitle: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: 1,
    },
    rowTrailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    rowValue: {
      ...type.caption,
      fontFamily: fontFamily.regular,
      color: colors.textMuted,
    },
    segment: {
      flexDirection: 'row',
      padding: 3,
      borderRadius: radius.md,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 34,
      borderRadius: radius.sm + 1,
    },
    segmentItemActive: {
      backgroundColor: colors.surfaceElevated,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    segmentLabel: {
      ...type.caption,
      color: colors.textMuted,
    },
    segmentLabelActive: {
      fontFamily: fontFamily.semibold,
      color: colors.text,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    emptyTitle: {
      ...type.cardTitle,
      color: colors.text,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    emptyBody: {
      ...type.caption,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },
    emptyAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    emptyActionText: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.onPrimary,
    },
  });
