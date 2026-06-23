import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AmountText } from './AmountText';
import { Card } from './Card';
import { DualAmount } from './DualAmount';
import { ProgressRing } from './ProgressRing';
import type { Creditor, Envelope, Transaction } from '@/lib/db/types';
import { formatMoney } from '@/lib/money';
import { envelopeOwed, envelopeTotals, ringRatios, stackTotals } from '@/lib/budgetMath';
import { useConvert } from '@/lib/useConvert';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, spacing } from '@/lib/theme';

interface StackCardProps {
  name: string;
  envelopes: Envelope[];
  transactions: Transaction[];
  creditors: Creditor[];
  currency: string;
  onPressEnvelope: (id: string) => void;
}

/**
 * Merged card for a stack of envelopes: each member's ring + percent on the
 * left, the stack's aggregate totals on the right. Members stay individually
 * tappable (and individually selectable when adding spending).
 */
export function StackCard({
  name,
  envelopes,
  transactions,
  creditors,
  currency,
  onPressEnvelope,
}: StackCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { convert } = useConvert();
  // Aggregate shown in the default (base) currency.
  const totals = stackTotals(envelopes, transactions, creditors, currency, convert);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.stackTag}>STACK</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <View style={styles.headerRight}>
          <AmountText
            minor={totals.remaining}
            currency={currency}
            size="xl"
            style={{ color: totals.remaining < 0 ? colors.negative : colors.text }}
          />
          <Text style={styles.leftLabel}>
            left of {formatMoney(totals.budget, currency)}
          </Text>
          {totals.owed > 0 && (
            <Text style={[styles.owed, { color: colors.owed }]}>
              +{formatMoney(totals.owed, currency)} owed
            </Text>
          )}
        </View>
      </View>

      <View style={styles.members}>
        {envelopes.map((env) => {
          const t = envelopeTotals(env.id, transactions, env.allocated, env.currency, convert);
          const budget = env.allocated + t.toppedUp;
          const owed = envelopeOwed(creditors, env.id, env.currency, convert);
          const ring = ringRatios(t.remaining, owed, budget);
          return (
            <Pressable
              key={env.id}
              style={styles.member}
              onPress={() => onPressEnvelope(env.id)}
            >
              <ProgressRing
                progress={ring.fill}
                owedProgress={ring.owed}
                size={52}
                label={`${ring.fillPct}%`}
              />
              <Text style={styles.memberName} numberOfLines={1}>
                {env.name}
              </Text>
              <DualAmount minor={t.remaining} currency={env.currency} size="sm" align="left" />
              {owed > 0 && (
                <Text style={[styles.memberOwed, { color: colors.owed }]}>
                  +{formatMoney(owed, env.currency)}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    titleWrap: {
      flex: 1,
      marginRight: spacing.md,
    },
    stackTag: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: c.textFaint,
    },
    name: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: c.text,
      marginTop: 2,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    leftLabel: {
      fontSize: fontSize.xs,
      color: c.textFaint,
      marginTop: 1,
    },
    owed: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      marginTop: 2,
    },
    members: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.lg,
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    member: {
      alignItems: 'center',
      minWidth: 76,
    },
    memberName: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: c.text,
      marginTop: spacing.xs,
      maxWidth: 84,
    },
    memberOwed: {
      fontSize: 10,
      fontWeight: '700',
      marginTop: 1,
    },
  });
