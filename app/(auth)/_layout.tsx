import { Stack } from 'expo-router/stack';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#090A0F' },
        animation: 'slide_from_right',
        animationDuration: 240,
      }}
    />
  );
}
