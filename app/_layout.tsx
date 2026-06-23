import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setQuickEnvelopes } from '@/lib/notificationReader';
import { topEnvelopes, useBudget } from '@/lib/store';
import { useTheme } from '@/lib/useTheme';

export default function RootLayout() {
  const hydrate = useBudget((s) => s.hydrate);
  const refreshRates = useBudget((s) => s.refreshRates);
  const envelopes = useBudget((s) => s.envelopes);
  const transactions = useBudget((s) => s.transactions);
  const drEnabled = useBudget((s) => s.drEnabled);
  const { scheme, colors } = useTheme();

  // SQLite is the source of truth; pull it into the in-memory store once, then
  // best-effort refresh exchange rates (no-op when offline).
  useEffect(() => {
    hydrate();
    refreshRates();
  }, [hydrate, refreshRates]);

  // Keep the notification's quick-add buttons pointed at the most-used envelopes.
  useEffect(() => {
    if (!drEnabled) return;
    setQuickEnvelopes(
      topEnvelopes(envelopes, transactions, 3).map((e) => ({ id: e.id, name: e.name }))
    );
  }, [drEnabled, envelopes, transactions]);

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
            name="digital-receipts/index"
            options={{ title: 'Digital receipts', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="digital-receipts/apps"
            options={{ title: 'Apps to monitor', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="digital-receipts/ledger"
            options={{ title: 'Digital receipt ledger', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="digital-receipts/quick-add"
            options={{ title: 'Quick add', presentation: 'modal' }}
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
