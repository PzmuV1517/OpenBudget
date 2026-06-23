import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { DualAmount } from '@/components/DualAmount';
import { EnvelopePill } from '@/components/EnvelopePill';
import type { Envelope, Transaction } from '@/lib/db/types';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'txn'; key: string; txn: Transaction };

function dayLabel(ts: number): string {
  const d = new Date(ts);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, d MMM yyyy');
}

/** Flatten newest-first transactions into [header, ...txns, header, ...] rows. */
function buildRows(transactions: Transaction[]): Row[] {
  const rows: Row[] = [];
  let currentDay = '';
  for (const txn of transactions) {
    const label = dayLabel(txn.createdAt);
    if (label !== currentDay) {
      currentDay = label;
      rows.push({ kind: 'header', key: `h-${label}`, label });
    }
    rows.push({ kind: 'txn', key: txn.id, txn });
  }
  return rows;
}

export default function SpendingScreen() {
  const router = useRouter();
  const transactions = useBudget((s) => s.transactions);
  const envelopes = useBudget((s) => s.envelopes);
  const refreshBudget = useBudget((s) => s.refreshBudget);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const envById = useMemo(() => {
    const m = new Map<string, Envelope>();
    for (const e of envelopes) m.set(e.id, e);
    return m;
  }, [envelopes]);

  const rows = useMemo(() => buildRows(transactions), [transactions]);

  function confirmRefresh() {
    Alert.alert(
      'Refresh budget',
      'Start a new cycle? This clears the entire spending ledger and refills every envelope back to its allocation. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Refresh', style: 'destructive', onPress: refreshBudget },
      ]
    );
  }

  const refreshBar = (
    <Pressable style={styles.refreshBar} onPress={confirmRefresh}>
      <Ionicons name="refresh" size={18} color={colors.accent} />
      <Text style={styles.refreshText}>Refresh budget</Text>
    </Pressable>
  );

  if (transactions.length === 0) {
    return (
      <View style={styles.screen}>
        {refreshBar}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No transactions yet.</Text>
          <Text style={styles.emptyHint}>
            Add spending from the Home tab with the + button.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {refreshBar}
      <FlashList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
        if (item.kind === 'header') {
          return <Text style={styles.header}>{item.label}</Text>;
        }
        const txn = item.txn;
        const env = envById.get(txn.envelopeId);
        const title =
          txn.merchant?.trim() ||
          txn.note?.trim() ||
          (txn.amount >= 0 ? 'Top-up' : 'Spending');
        const itemCount = txn.lineItems?.length ?? 0;
        return (
          <Pressable
            onPress={() => router.push(`/transaction/${txn.id}`)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            <View style={styles.rowLeft}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              <View style={styles.rowMeta}>
                {env && <EnvelopePill name={env.name} color={env.color} />}
                {itemCount > 0 && (
                  <Text style={styles.itemBadge}>
                    {itemCount} item{itemCount === 1 ? '' : 's'}
                  </Text>
                )}
              </View>
            </View>
            <DualAmount
              minor={txn.amount}
              currency={txn.currency}
              colorBySign
              size="md"
            />
          </Pressable>
          );
        }}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    refreshBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    refreshText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.accent,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    header: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: c.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLeft: {
      flex: 1,
      marginRight: spacing.md,
    },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 4,
    },
    itemBadge: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: c.textFaint,
    },
    title: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: c.text,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: c.background,
    },
    emptyText: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
    },
    emptyHint: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
  });
