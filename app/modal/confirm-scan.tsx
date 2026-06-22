import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EnvelopePicker } from '@/components/EnvelopePicker';
import { formatMoney, toMinorUnits } from '@/lib/money';
import { normalizeAmount } from '@/lib/receipt';
import { clearPendingScan, peekPendingScan } from '@/lib/scanHandoff';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function ConfirmScanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const envelopes = useBudget((s) => s.envelopes);
  const addTransaction = useBudget((s) => s.addTransaction);

  // Read the stashed parse once on mount.
  const parsed = useMemo(() => peekPendingScan(), []);

  const currency = parsed?.currency ?? useBudget.getState().defaultCurrency;
  const [amount, setAmount] = useState(
    parsed?.amount != null ? String(parsed.amount) : ''
  );
  const [envelopeId, setEnvelopeId] = useState<string | null>(
    envelopes[0]?.id ?? null
  );

  // Clear the hand-off when the modal unmounts so it can't leak to a later scan.
  useEffect(() => () => clearPendingScan(), []);

  const value = normalizeAmount(amount);
  const valid = value !== null && value > 0 && envelopeId !== null;

  function handleSave() {
    if (!valid || value === null || envelopeId === null) return;
    addTransaction({
      envelopeId,
      amount: -toMinorUnits(value, currency),
      currency,
      merchant: parsed?.merchant ?? null,
      note: null,
      source: 'scan',
      rawOcr: parsed?.rawText ?? null,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissAll();
  }

  if (!parsed) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Nothing to confirm.</Text>
        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const lowConfidence = parsed.amount == null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Ionicons
            name={lowConfidence ? 'alert-circle' : 'sparkles'}
            size={18}
            color={lowConfidence ? colors.warning : colors.accent}
          />
          <Text style={styles.bannerText}>
            {lowConfidence
              ? "Couldn't read a total — enter it manually."
              : 'Detected total below. Check it before saving.'}
          </Text>
        </View>

        {parsed.merchant ? (
          <Text style={styles.merchant}>{parsed.merchant}</Text>
        ) : null}

        <Text style={styles.label}>Amount ({currency})</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.textFaint}
          keyboardType="decimal-pad"
          style={styles.amountInput}
          autoFocus={lowConfidence}
        />

        {parsed.candidates.length > 1 && (
          <>
            <Text style={styles.label}>Other amounts found</Text>
            <View style={styles.chips}>
              {parsed.candidates.slice(0, 6).map((cand, i) => (
                <Pressable
                  key={`${cand.lineIndex}-${i}`}
                  onPress={() => setAmount(String(cand.value))}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>
                    {formatMoney(toMinorUnits(cand.value, currency), currency)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Envelope</Text>
        <EnvelopePicker
          envelopes={envelopes}
          selectedId={envelopeId}
          onSelect={setEnvelopeId}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={!valid}
          style={[styles.saveBtn, !valid && { opacity: 0.4 }]}
        >
          <Text style={styles.saveText}>Save spending</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: {
      padding: spacing.lg,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
    },
    bannerText: {
      flex: 1,
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
    merchant: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.lg,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: c.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    amountInput: {
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      fontSize: fontSize.display,
      fontWeight: '700',
      color: c.text,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      backgroundColor: c.cardAlt,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    chipText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: c.text,
    },
    footer: {
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    saveBtn: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    saveText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
    muted: {
      color: c.textMuted,
      fontSize: fontSize.md,
    },
    linkBtn: {
      marginTop: spacing.md,
    },
    link: {
      color: c.accent,
      fontWeight: '700',
      fontSize: fontSize.md,
    },
  });
