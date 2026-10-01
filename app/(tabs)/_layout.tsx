import { Tabs } from 'expo-router/js-tabs';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, type IconName } from '@/components/Icon';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { haptics } from '@/utils/haptics';

const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  envelopes: 'envelope',
  activity: 'activity',
  profile: 'profile',
};

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 10);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <LinearGradient
        colors={[
          'transparent',
          scheme === 'dark' ? 'rgba(9,10,15,0.95)' : 'rgba(244,246,251,0.95)',
        ]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const focused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? TAB_ICONS.index;

          return (
            <View key={route.key} style={styles.itemWrap}>
              <Pressable
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
                style={styles.touch}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
              >
                {focused ? <View style={styles.activeDot} /> : null}
                <Icon
                  name={icons}
                  size={22}
                  color={focused ? colors.primary : colors.textMuted}
                  strokeWidth={focused ? 2.1 : 1.7}
                />
                <View
                  style={[
                    styles.indicator,
                    focused && styles.indicatorActive,
                  ]}
                />
              </Pressable>
            </View>
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
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarLabel: 'Home' }}
      />
      <Tabs.Screen
        name="envelopes"
        options={{ title: 'Envelopes', tabBarLabel: 'Envelopes' }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: 'Activity', tabBarLabel: 'Activity' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
    </Tabs>
  );
}

const createStyles = (colors: Palette, scheme: 'light' | 'dark') =>
  StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 18,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor:
      scheme === 'dark' ? 'rgba(23,25,35,0.96)' : 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemWrap: {
    flex: 1,
    alignItems: 'center',
  },
  touch: {
    width: 64,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  activeDot: {
    position: 'absolute',
    top: 2,
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  indicator: {
    height: 2,
    width: 0,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
});
