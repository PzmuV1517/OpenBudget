import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddSheet } from '@/components/AddSheet';
import { AmountText } from '@/components/AmountText';
import { Card } from '@/components/Card';
import { EnvelopeCard } from '@/components/EnvelopeCard';
import { FAB } from '@/components/FAB';
import { progressRatio } from '@/lib/money';
import { budgetSummary, envelopeTotals, useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [sheetOpen, setSheetOpen] = useState(false);

  const envelopes = useBudget((s) => s.envelopes);
  const transactions = useBudget((s) => s.transactions);
  const currency = useBudget((s) => s.defaultCurrency);

  const summary = useMemo(
    () => budgetSummary(envelopes, transactions),
    [envelopes, transactions]
  );
  const spentRatio = progressRatio(summary.totalSpent, summary.totalAllocated);
  const fillColor =
    spentRatio >= 1 ? colors.negative : spentRatio >= 0.85 ? colors.warning : colors.accent;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>OpenBudget</Text>

        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>Remaining</Text>
          <AmountText
            minor={summary.totalRemaining}
            currency={currency}
            size="display"
            style={{
              color: summary.totalRemaining < 0 ? colors.negative : colors.text,
            }}
          />
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, spentRatio * 100)}%`, backgroundColor: fillColor },
              ]}
            />
          </View>
          <View style={styles.summaryRow}>
            <Stat label="Budget" minor={summary.totalAllocated} currency={currency} styles={styles} />
            <Stat label="Spent" minor={summary.totalSpent} currency={currency} styles={styles} />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Envelopes</Text>

        {envelopes.length === 0 ? (
          <EmptyState
            onCreate={() => router.push('/(tabs)/envelopes')}
            styles={styles}
            faint={colors.textFaint}
          />
        ) : (
          envelopes.map((env) => {
            const totals = envelopeTotals(env.id, transactions, env.allocated);
            return (
              <EnvelopeCard
                key={env.id}
                envelope={env}
                totals={totals}
                currency={currency}
                onPress={() => router.push(`/envelope/${env.id}`)}
              />
            );
          })
        )}
      </ScrollView>

      <FAB onPress={() => setSheetOpen(true)} />

      <AddSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onManual={() => {
          setSheetOpen(false);
          router.push('/add/manual');
        }}
        onScan={() => {
          setSheetOpen(false);
          router.push('/add/scan');
        }}
      />
    </View>
  );
}

function Stat({
  label,
  minor,
  currency,
  styles,
}: {
  label: string;
  minor: number;
  currency: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <AmountText minor={minor} currency={currency} size="lg" muted={label === 'Spent'} />
    </View>
  );
}

function EmptyState({
  onCreate,
  styles,
  faint,
}: {
  onCreate: () => void;
  styles: ReturnType<typeof makeStyles>;
  faint: string;
}) {
  return (
    <Card style={styles.empty}>
      <Ionicons name="albums-outline" size={36} color={faint} />
      <Text style={styles.emptyTitle}>No envelopes yet</Text>
      <Text style={styles.emptyHint}>
        Create envelopes to divide your budget, then add spending with the + button.
      </Text>
      <Text style={styles.emptyAction} onPress={onCreate}>
        Go to Envelopes →
      </Text>
    </Card>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
    },
    heading: {
      fontSize: fontSize.xxl,
      fontWeight: '800',
      color: c.text,
      marginBottom: spacing.md,
    },
    summary: {
      marginBottom: spacing.xl,
    },
    summaryLabel: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginBottom: spacing.xs,
    },
    progressTrack: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: c.cardAlt,
      overflow: 'hidden',
      marginTop: spacing.md,
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
    },
    statLabel: {
      fontSize: fontSize.xs,
      color: c.textFaint,
      marginBottom: 2,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginBottom: spacing.md,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.md,
    },
    emptyHint: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.lg,
    },
    emptyAction: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.accent,
      marginTop: spacing.lg,
    },
  });
