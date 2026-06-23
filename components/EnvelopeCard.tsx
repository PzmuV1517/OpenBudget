import { StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { DualAmount } from './DualAmount';
import { ListRow } from './ListRow';
import { ProgressRing } from './ProgressRing';
import { formatMoney } from '@/lib/money';
import { ringRatios } from '@/lib/budgetMath';
import type { Envelope, EnvelopeTotals } from '@/lib/db/types';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, spacing } from '@/lib/theme';

interface EnvelopeCardProps {
  envelope: Envelope;
  /** Totals computed in the envelope's own currency. */
  totals: EnvelopeTotals;
  /** Outstanding owed to this envelope (envelope currency, minor units). */
  owed?: number;
  onPress?: () => void;
}

/** Home-screen envelope row: name, remaining vs budget, progress ring. */
export function EnvelopeCard({ envelope, totals, owed = 0, onPress }: EnvelopeCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const currency = envelope.currency;
  const budget = envelope.allocated + totals.toppedUp;
  const ring = ringRatios(totals.remaining, owed, budget);

  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.inner}>
        <ListRow
          onPress={onPress}
          showChevron
          left={
            <ProgressRing
              progress={ring.fill}
              owedProgress={ring.owed}
              size={46}
              label={`${ring.fillPct}%`}
            />
          }
          title={envelope.name}
          subtitle={`${formatMoney(totals.remaining, currency)} of ${formatMoney(budget, currency)} left`}
          right={
            <View style={styles.amounts}>
              <DualAmount
                minor={totals.remaining}
                currency={currency}
                size="md"
                primaryStyle={{
                  color: totals.remaining < 0 ? colors.negative : colors.text,
                }}
              />
              {owed > 0 && (
                <Text style={[styles.owed, { color: colors.owed }]}>
                  +{formatMoney(owed, currency)} owed · {ring.owedPct}%
                </Text>
              )}
            </View>
          }
        />
      </View>
    </Card>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.md,
    },
    inner: {
      paddingHorizontal: spacing.lg,
    },
    amounts: {
      alignItems: 'flex-end',
    },
    ofBudget: {
      fontSize: fontSize.xs,
      color: c.textFaint,
      marginTop: 1,
    },
    owed: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      marginTop: 1,
    },
  });
