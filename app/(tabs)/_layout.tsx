import { Tabs } from 'expo-router/js-tabs';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import type { Palette } from '@/constants/theme';
import { layout } from '@/constants/layout';
import { fontFamily } from '@/constants/typography';
import { useThemedStyles, useTheme } from '@/store/theme';
import { haptics } from '@/utils/haptics';

const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  envelopes: 'envelope',
  activity: 'activity',
  profile: 'profile',
};

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 6 : 8);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const focused = state.index === index;
          const icon = TAB_ICONS[route.name] ?? TAB_ICONS.index;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  haptics.light();
                  navigation.navigate(route.name);
                }
              }}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <Icon
                  name={icon}
                  size={21}
                  color={focused ? colors.text : colors.textMuted}
                  strokeWidth={focused ? 2.1 : 1.8}
                />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="envelopes" options={{ title: 'Envelopes', tabBarLabel: 'Envelopes' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarLabel: 'Activity' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
    </Tabs>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    bar: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderStrong,
      paddingTop: 6,
    },
    inner: {
      flexDirection: 'row',
      maxWidth: layout.maxContentWidth,
      width: '100%',
      alignSelf: 'center',
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minHeight: layout.minTouchTarget + 6,
    },
    iconPill: {
      width: 56,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconPillActive: {
      backgroundColor: colors.primaryMuted,
    },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textMuted,
    },
    labelActive: {
      fontFamily: fontFamily.semibold,
      color: colors.text,
    },
  });
