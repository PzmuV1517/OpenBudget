import { StyleSheet, Text, View } from 'react-native';

import { AmountText } from './AmountText';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { ProgressRing } from './ProgressRing';
import { formatMoney, progressRatio } from '@/lib/money';
import type { Envelope, EnvelopeTotals } from '@/lib/db/types';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, spacing } from '@/lib/theme';

interface EnvelopeCardProps {
  envelope: Envelope;
  totals: EnvelopeTotals;
  currency: string;
  onPress?: () => void;
}

/** Home-screen envelope row: name, remaining vs budget, progress ring. */
export function EnvelopeCard({ envelope, totals, currency, onPress }: EnvelopeCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const budget = envelope.allocated + totals.toppedUp;
  const ratio = progressRatio(totals.spent, budget);
  const pct = Math.round(ratio * 100);

  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.inner}>
        <ListRow
          onPress={onPress}
          showChevron
          left={
            <ProgressRing
              progress={ratio}
              size={46}
              color={ratio < 0.85 ? envelope.color : undefined}
              label={`${pct}%`}
            />
          }
          title={envelope.name}
          subtitle={`${formatMoney(totals.spent, currency)} of ${formatMoney(budget, currency)}`}
          right={
            <View style={styles.amounts}>
              <AmountText
                minor={totals.remaining}
                currency={currency}
                size="md"
                style={{ color: totals.remaining < 0 ? colors.negative : colors.text }}
              />
              <Text style={styles.ofBudget}>left</Text>
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
  });
