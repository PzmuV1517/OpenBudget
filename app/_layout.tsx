import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useBudget } from '@/lib/store';
import { useTheme } from '@/lib/useTheme';

export default function RootLayout() {
  const hydrate = useBudget((s) => s.hydrate);
  const { scheme, colors } = useTheme();

  // SQLite is the source of truth; pull it into the in-memory store once.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="envelope/[id]"
            options={{ title: 'Envelope', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="transaction/[id]"
            options={{ title: 'Transaction', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="add/manual"
            options={{ title: 'Add spending', presentation: 'modal' }}
          />
          <Stack.Screen
            name="add/scan"
            options={{ title: 'Scan receipt', presentation: 'modal' }}
          />
          <Stack.Screen
            name="modal/confirm-scan"
            options={{ title: 'Confirm amount', presentation: 'modal' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
