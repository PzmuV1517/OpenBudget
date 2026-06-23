import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountText } from '@/components/AmountText';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { formatMoney, progressRatio, toMinorUnits } from '@/lib/money';
import { normalizeAmount } from '@/lib/receipt';
import { envelopeTotals, useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function EnvelopeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const envelope = useBudget((s) => s.envelopes.find((e) => e.id === id));
  const transactions = useBudget((s) => s.transactions);
  const currency = useBudget((s) => s.defaultCurrency);
  const topUp = useBudget((s) => s.topUp);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const envTxns = useMemo(
    () => transactions.filter((t) => t.envelopeId === id),
    [transactions, id]
  );

  if (!envelope) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This envelope no longer exists.</Text>
      </View>
    );
  }

  const totals = envelopeTotals(envelope.id, transactions, envelope.allocated);
  const budget = envelope.allocated + totals.toppedUp;
  const ratio = progressRatio(totals.spent, budget);

  function handleTopUp() {
    const parsed = normalizeAmount(amount);
    if (parsed === null || parsed <= 0 || !envelope) return;
    topUp(envelope.id, toMinorUnits(parsed, currency), currency);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount('');
    setTopUpOpen(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: envelope.name }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.hero}>
          <ProgressRing
            progress={ratio}
            size={120}
            strokeWidth={10}
            color={ratio < 0.85 ? envelope.color : undefined}
            label={`${Math.round(ratio * 100)}%`}
          />
          <Text style={styles.remainingLabel}>Remaining</Text>
          <AmountText
            minor={totals.remaining}
            currency={currency}
            size="display"
            style={{ color: totals.remaining < 0 ? colors.negative : colors.text }}
          />
          <Text style={styles.sub}>
            {formatMoney(totals.spent, currency)} spent of{' '}
            {formatMoney(budget, currency)}
          </Text>

          <Pressable style={styles.topUpBtn} onPress={() => setTopUpOpen(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.topUpText}>Add money</Text>
          </Pressable>
        </Card>

        <Text style={styles.sectionTitle}>History</Text>
        {envTxns.length === 0 ? (
          <Text style={styles.empty}>No transactions in this envelope yet.</Text>
        ) : (
          <Card padded={false} style={styles.histCard}>
            {envTxns.map((t, i) => (
              <View key={t.id}>
                <Pressable
                  onPress={() => router.push(`/transaction/${t.id}`)}
                  style={({ pressed }) => [styles.txnRow, pressed && { opacity: 0.6 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnTitle} numberOfLines={1}>
                      {t.merchant?.trim() ||
                        t.note?.trim() ||
                        (t.amount >= 0 ? 'Top-up' : 'Spending')}
                    </Text>
                    <Text style={styles.txnDate}>
                      {new Date(t.createdAt).toLocaleDateString()} ·{' '}
                      {t.source === 'scan' ? 'Scanned' : 'Manual'}
                    </Text>
                  </View>
                  <AmountText
                    minor={t.amount}
                    currency={t.currency}
                    colorBySign
                    size="md"
                  />
                </Pressable>
                {i < envTxns.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <Modal visible={topUpOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setTopUpOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Add money to {envelope.name}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              autoFocus
              style={styles.input}
            />
            <Pressable
              onPress={handleTopUp}
              disabled={normalizeAmount(amount) === null}
              style={[
                styles.confirmBtn,
                normalizeAmount(amount) === null && { opacity: 0.4 },
              ]}
            >
              <Text style={styles.confirmText}>Add money</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    hero: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    remainingLabel: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: spacing.lg,
    },
    sub: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: spacing.xs,
    },
    topUpBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.accent,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
    },
    topUpText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: fontSize.md,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    empty: {
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
    histCard: {
      paddingHorizontal: spacing.lg,
    },
    txnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    txnTitle: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: c.text,
    },
    txnDate: {
      fontSize: fontSize.xs,
      color: c.textFaint,
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    missing: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
    missingText: {
      fontSize: fontSize.md,
      color: c.textMuted,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.border,
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: c.cardAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.xl,
      color: c.text,
    },
    confirmBtn: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    confirmText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '700',
    },
  });
