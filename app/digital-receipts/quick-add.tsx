import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney, toMinorUnits } from '@/lib/money';
import { normalizeAmount } from '@/lib/receipt';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

/**
 * Reached from a notification quick-add button: subtracts the captured amount
 * from the chosen envelope immediately, then offers undo. Body-tap of the
 * notification goes to /add/manual instead (the full form).
 */
export default function QuickAddScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ amount?: string; envelope?: string; note?: string }>();

  const envelopes = useBudget((s) => s.envelopes);
  const currency = useBudget((s) => s.defaultCurrency);
  const addTransaction = useBudget((s) => s.addTransaction);
  const deleteTransaction = useBudget((s) => s.deleteTransaction);

  const env = envelopes.find((e) => e.id === params.envelope);
  const value = params.amount ? normalizeAmount(params.amount) : null;

  const addedId = useRef<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (addedId.current || !env || value === null || value <= 0) return;
    const txn = addTransaction({
      envelopeId: env.id,
      amount: -toMinorUnits(value, currency),
      currency,
      merchant: params.note?.trim() || null,
      note: null,
      source: 'scan',
    });
    addedId.current = txn.id;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!env || value === null || value <= 0) {
    return (
      <View style={styles.screen}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.warning} />
        <Text style={styles.title}>Couldn&apos;t add automatically</Text>
        <Text style={styles.body}>The envelope or amount wasn&apos;t recognised.</Text>
        <Pressable
          style={styles.primary}
          onPress={() =>
            router.replace(
              `/add/manual?amount=${params.amount ?? ''}&note=${params.note ?? ''}`
            )
          }
        >
          <Text style={styles.primaryText}>Enter manually</Text>
        </Pressable>
      </View>
    );
  }

  function undo() {
    if (addedId.current) deleteTransaction(addedId.current);
    router.replace('/(tabs)/spending');
  }

  return (
    <View style={styles.screen}>
      <Ionicons name="checkmark-circle" size={56} color={colors.positive} />
      <Text style={styles.title}>Added to {env.name}</Text>
      <Text style={styles.amount}>
        −{formatMoney(toMinorUnits(value, currency), currency)}
      </Text>
      {params.note ? <Text style={styles.body}>{params.note}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={undo}>
          <Text style={styles.secondaryText}>Undo</Text>
        </Pressable>
        <Pressable style={styles.primary} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryText}>Done</Text>
        </Pressable>
      </View>

      {done && (
        <Pressable
          onPress={() =>
            addedId.current && router.replace(`/transaction/${addedId.current}`)
          }
        >
          <Text style={styles.link}>Edit this transaction</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: c.background,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: '800',
      color: c.text,
      marginTop: spacing.md,
    },
    amount: {
      fontSize: fontSize.display,
      fontWeight: '800',
      color: c.negative,
      marginTop: spacing.sm,
    },
    body: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xl,
    },
    primary: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    primaryText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
    secondary: {
      backgroundColor: c.cardAlt,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    secondaryText: { color: c.text, fontSize: fontSize.md, fontWeight: '700' },
    link: {
      color: c.accent,
      fontWeight: '700',
      fontSize: fontSize.md,
      marginTop: spacing.xl,
    },
  });
