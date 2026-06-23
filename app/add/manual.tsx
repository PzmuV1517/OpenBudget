import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
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

import { CurrencyChips } from '@/components/CurrencyChips';
import { EnvelopePicker } from '@/components/EnvelopePicker';
import { toMinorUnits } from '@/lib/money';
import { normalizeAmount } from '@/lib/receipt';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function ManualAddScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const envelopes = useBudget((s) => s.envelopes);
  const defaultCurrency = useBudget((s) => s.defaultCurrency);
  const addTransaction = useBudget((s) => s.addTransaction);

  // Optional prefill (e.g. from a captured digital receipt).
  const prefill = useLocalSearchParams<{ amount?: string; note?: string }>();
  const [amount, setAmount] = useState(prefill.amount ?? '');
  const [note, setNote] = useState(prefill.note ?? '');
  const [envelopeId, setEnvelopeId] = useState<string | null>(
    envelopes[0]?.id ?? null
  );
  // Default to the first envelope's currency; user can override.
  const [curr, setCurr] = useState(envelopes[0]?.currency ?? defaultCurrency);

  const parsed = normalizeAmount(amount);
  const valid = parsed !== null && parsed > 0 && envelopeId !== null;

  function handleSave() {
    if (!valid || parsed === null || envelopeId === null) return;
    addTransaction({
      envelopeId,
      amount: -toMinorUnits(parsed, curr), // spend = negative
      currency: curr,
      note: note.trim() || null,
      source: 'manual',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  if (envelopes.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="albums-outline" size={36} color={colors.textFaint} />
        <Text style={styles.emptyText}>Create an envelope first</Text>
        <Text style={styles.emptyHint}>
          You need at least one envelope to record spending.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Amount ({curr})</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.textFaint}
          keyboardType="decimal-pad"
          autoFocus
          style={styles.amountInput}
        />

        <Text style={styles.label}>Currency</Text>
        <CurrencyChips value={curr} onChange={setCurr} />

        <Text style={styles.label}>Envelope</Text>
        <EnvelopePicker
          envelopes={envelopes}
          selectedId={envelopeId}
          onSelect={setEnvelopeId}
        />

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Lunch with Sam"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
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
    input: {
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
      color: c.text,
    },
    footer: {
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.background,
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
      marginTop: spacing.md,
    },
    emptyHint: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
