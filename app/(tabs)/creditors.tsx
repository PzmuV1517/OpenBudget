import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
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
import { CurrencyChips } from '@/components/CurrencyChips';
import { DualAmount } from '@/components/DualAmount';
import { EnvelopePicker } from '@/components/EnvelopePicker';
import { EnvelopePill } from '@/components/EnvelopePill';
import type { Creditor } from '@/lib/db/types';
import { formatMoney, toMajorUnits, toMinorUnits } from '@/lib/money';
import { normalizeAmount } from '@/lib/receipt';
import { useBudget } from '@/lib/store';
import { useConvert } from '@/lib/useConvert';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function CreditorsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const creditors = useBudget((s) => s.creditors);
  const envelopes = useBudget((s) => s.envelopes);
  const addCreditor = useBudget((s) => s.addCreditor);
  const updateCreditor = useBudget((s) => s.updateCreditor);
  const deleteCreditor = useBudget((s) => s.deleteCreditor);
  const collectCreditor = useBudget((s) => s.collectCreditor);
  const { convert, defaultCurrency } = useConvert();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Creditor | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [curr, setCurr] = useState(defaultCurrency);
  const [envelopeId, setEnvelopeId] = useState<string | null>(null);

  // Total owed, converted to the default currency (creditors may differ).
  const totalOwed = creditors.reduce(
    (sum, c) => sum + convert(c.amount, c.currency, defaultCurrency),
    0
  );
  const envById = new Map(envelopes.map((e) => [e.id, e]));

  function openAdd() {
    setEditing(null);
    setName('');
    setAmount('');
    setNote('');
    const first = envelopes[0];
    setEnvelopeId(first?.id ?? null);
    setCurr(first?.currency ?? defaultCurrency);
    setEditorOpen(true);
  }

  function openEdit(c: Creditor) {
    setEditing(c);
    setName(c.name ?? '');
    setAmount(String(toMajorUnits(c.amount, c.currency)));
    setNote(c.note ?? '');
    setCurr(c.currency);
    setEnvelopeId(c.envelopeId);
    setEditorOpen(true);
  }

  const parsed = normalizeAmount(amount);
  const valid = parsed !== null && parsed > 0 && envelopeId !== null;

  function save() {
    if (!valid || parsed === null || envelopeId === null) return;
    const patch = {
      envelopeId,
      name: name.trim() || null,
      amount: toMinorUnits(parsed, curr),
      note: note.trim() || null,
    };
    if (editing) updateCreditor(editing.id, patch);
    else addCreditor({ ...patch, currency: curr });
    setEditorOpen(false);
  }

  function collect(c: Creditor) {
    Alert.alert(
      'Debt collected',
      `Add ${formatMoney(c.amount, c.currency)} to ${
        envById.get(c.envelopeId)?.name ?? 'the envelope'
      } as money in hand this cycle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Collect', onPress: () => collectCreditor(c.id) },
      ]
    );
  }

  if (envelopes.length === 0) {
    return (
      <View style={styles.emptyScreen}>
        <Ionicons name="people-outline" size={40} color={colors.textFaint} />
        <Text style={styles.emptyTitle}>Create an envelope first</Text>
        <Text style={styles.emptyBody}>
          Money owed gets earmarked to an envelope, so you need at least one.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>Owed to you</Text>
          <AmountText
            minor={totalOwed}
            currency={defaultCurrency}
            size="display"
            style={{ color: colors.owed }}
          />
          <Text style={styles.summaryHint}>
            Pending money, not yet in your envelopes
          </Text>
        </Card>

        {creditors.length === 0 ? (
          <Text style={styles.hint}>
            No outstanding debts. Add money a friend owes you with the + button.
          </Text>
        ) : (
          creditors.map((c) => {
            const env = envById.get(c.envelopeId);
            return (
              <Card key={c.id} style={styles.row} padded={false}>
                <Pressable style={styles.rowTop} onPress={() => openEdit(c)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{c.name || 'Someone'}</Text>
                    {env && (
                      <View style={{ marginTop: 4 }}>
                        <EnvelopePill name={env.name} color={env.color} />
                      </View>
                    )}
                    {c.note ? <Text style={styles.note}>{c.note}</Text> : null}
                  </View>
                  <DualAmount
                    minor={c.amount}
                    currency={c.currency}
                    size="lg"
                    primaryStyle={{ color: colors.owed }}
                  />
                </Pressable>
                <Pressable style={styles.collectBtn} onPress={() => collect(c)}>
                  <Ionicons name="checkmark-done" size={18} color={colors.positive} />
                  <Text style={[styles.collectText, { color: colors.positive }]}>
                    Debt collected
                  </Text>
                </Pressable>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <Modal visible={editorOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setEditorOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editing ? 'Edit debt' : 'Money owed to you'}
              </Text>

              <Text style={styles.label}>Who owes you</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Sam"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />

              <Text style={styles.label}>Amount ({curr})</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textFaint}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Currency</Text>
              <CurrencyChips value={curr} onChange={setCurr} />

              <Text style={styles.label}>Goes to envelope</Text>
              <EnvelopePicker
                envelopes={envelopes}
                selectedId={envelopeId}
                onSelect={setEnvelopeId}
              />

              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Concert tickets"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />

              <Pressable
                onPress={save}
                disabled={!valid}
                style={[styles.saveBtn, !valid && { opacity: 0.4 }]}
              >
                <Text style={styles.saveText}>
                  {editing ? 'Save' : 'Add debt'}
                </Text>
              </Pressable>

              {editing && (
                <Pressable
                  onPress={() => {
                    deleteCreditor(editing.id);
                    setEditorOpen(false);
                  }}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg, paddingBottom: 120 },
    summary: { marginBottom: spacing.lg, alignItems: 'flex-start' },
    summaryLabel: { fontSize: fontSize.sm, color: c.textMuted },
    summaryHint: { fontSize: fontSize.xs, color: c.textFaint, marginTop: spacing.xs },
    hint: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    row: { marginBottom: spacing.md },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
    },
    name: { fontSize: fontSize.md, fontWeight: '700', color: c.text },
    note: { fontSize: fontSize.sm, color: c.textMuted, marginTop: spacing.xs },
    collectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    collectText: { fontSize: fontSize.md, fontWeight: '700' },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 60,
      height: 60,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingTop: spacing.lg,
      maxHeight: '88%',
    },
    sheetTitle: {
      fontSize: fontSize.xl,
      fontWeight: '800',
      color: c.text,
      marginBottom: spacing.sm,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: c.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: c.cardAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
      color: c.text,
    },
    saveBtn: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    saveText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
    deleteBtn: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
    deleteText: { color: c.negative, fontSize: fontSize.md, fontWeight: '600' },
    emptyScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: c.background,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.md,
    },
    emptyBody: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
