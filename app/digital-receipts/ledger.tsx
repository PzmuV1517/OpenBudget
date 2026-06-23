import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatMoney, toMinorUnits } from '@/lib/money';
import {
  type NativeReceipt,
  addCaptureListener,
  clearCapturedReceipts,
  getCapturedReceipts,
  isCaptureAvailable,
} from '@/lib/notificationReader';
import { normalizeAmount } from '@/lib/receipt';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function DigitalReceiptLedgerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const currency = useBudget((s) => s.defaultCurrency);

  const [receipts, setReceipts] = useState<NativeReceipt[]>([]);

  const load = useCallback(() => setReceipts(getCapturedReceipts()), []);

  useFocusEffect(useCallback(() => load(), [load]));

  // Live refresh while the screen is open and a capture arrives.
  useEffect(() => {
    const sub = addCaptureListener(() => load());
    return () => sub.remove();
  }, [load]);

  function addAsSpending(r: NativeReceipt) {
    const value = r.amountText ? normalizeAmount(r.amountText) : null;
    const params = new URLSearchParams();
    if (value !== null) params.set('amount', String(value));
    const desc = r.title?.trim() || r.app || r.pkg;
    if (desc) params.set('note', desc);
    router.push(`/add/manual?${params.toString()}`);
  }

  function clearAll() {
    clearCapturedReceipts();
    setReceipts([]);
  }

  if (receipts.length === 0) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Digital receipt ledger' }} />
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={44} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>No captured receipts</Text>
          <Text style={styles.emptyBody}>
            {isCaptureAvailable
              ? 'Payments detected from your selected apps will appear here, ready to file into an envelope.'
              : 'Capture needs the Android dev build with notification access — not active in this build.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Digital receipt ledger',
          headerRight: () => (
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ),
        }}
      />

      {receipts.map((r, i) => {
        const value = r.amountText ? normalizeAmount(r.amountText) : null;
        const minor = value !== null ? toMinorUnits(value, currency) : null;
        return (
          <View key={`${r.timestamp}-${i}`} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.app}>{r.app || r.pkg}</Text>
                <Text style={styles.detail} numberOfLines={2}>
                  {r.title?.trim() || r.text?.trim() || '—'}
                </Text>
                <Text style={styles.time}>
                  {format(new Date(r.timestamp), 'd MMM yyyy, HH:mm')}
                </Text>
              </View>
              <Text style={styles.amount}>
                {minor !== null ? formatMoney(minor, currency) : (r.amountText ?? '—')}
              </Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => addAsSpending(r)}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.addText}>Add as spending</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    clear: {
      color: c.accent,
      fontWeight: '700',
      fontSize: fontSize.md,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    app: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.text,
    },
    detail: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: 2,
    },
    time: {
      fontSize: fontSize.xs,
      color: c.textFaint,
      marginTop: 4,
    },
    amount: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: c.text,
      fontVariant: ['tabular-nums'],
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    addText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.accent,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.md,
    },
    emptyBody: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
