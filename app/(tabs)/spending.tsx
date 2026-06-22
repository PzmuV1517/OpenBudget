import { FlashList } from '@shopify/flash-list';
import { format, isToday, isYesterday } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AmountText } from '@/components/AmountText';
import { EnvelopePill } from '@/components/EnvelopePill';
import type { Envelope, Transaction } from '@/lib/db/types';
import { useBudget } from '@/lib/store';
import { useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, spacing } from '@/lib/theme';

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
  const transactions = useBudget((s) => s.transactions);
  const envelopes = useBudget((s) => s.envelopes);
  const styles = useThemedStyles(makeStyles);

  const envById = useMemo(() => {
    const m = new Map<string, Envelope>();
    for (const e of envelopes) m.set(e.id, e);
    return m;
  }, [envelopes]);

  const rows = useMemo(() => buildRows(transactions), [transactions]);

  if (transactions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No transactions yet.</Text>
        <Text style={styles.emptyHint}>
          Add spending from the Home tab with the + button.
        </Text>
      </View>
    );
  }

  return (
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
        return (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              {env && (
                <View style={{ marginTop: 4 }}>
                  <EnvelopePill name={env.name} color={env.color} />
                </View>
              )}
            </View>
            <AmountText
              minor={txn.amount}
              currency={txn.currency}
              colorBySign
              size="md"
            />
          </View>
        );
      }}
    />
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
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
