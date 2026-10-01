import { Stack } from 'expo-router/stack';
import React from 'react';
import { useTheme } from '@/store/theme';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 240,
      }}
    />
  );
}