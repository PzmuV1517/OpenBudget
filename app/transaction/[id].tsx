import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AmountText } from '@/components/AmountText';
import { Card } from '@/components/Card';
import { EnvelopePill } from '@/components/EnvelopePill';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, spacing } from '@/lib/theme';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const txn = useBudget((s) => s.transactions.find((t) => t.id === id));
  const envelope = useBudget((s) =>
    s.envelopes.find((e) => e.id === txn?.envelopeId)
  );
  const updateTransaction = useBudget((s) => s.updateTransaction);
  const deleteTransaction = useBudget((s) => s.deleteTransaction);

  const [note, setNote] = useState(txn?.note ?? '');

  const itemsTotal = useMemo(
    () => (txn?.lineItems ?? []).reduce((sum, it) => sum + it.price, 0),
    [txn?.lineItems]
  );

  if (!txn) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This transaction no longer exists.</Text>
      </View>
    );
  }

  const hasItems = !!txn.lineItems && txn.lineItems.length > 0;
  const title =
    txn.merchant?.trim() || txn.note?.trim() || (txn.amount >= 0 ? 'Top-up' : 'Spending');

  function saveNote() {
    updateTransaction(txn!.id, { note: note.trim() || null });
  }

  function confirmDelete() {
    Alert.alert('Delete transaction', 'Remove this transaction? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(txn!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Stack.Screen options={{ title: 'Transaction' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.hero}>
          <AmountText
            minor={txn.amount}
            currency={txn.currency}
            colorBySign
            size="display"
          />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.meta}>
            {envelope && <EnvelopePill name={envelope.name} color={envelope.color} />}
            <Text style={styles.metaText}>
              {format(new Date(txn.createdAt), 'd MMM yyyy, HH:mm')} ·{' '}
              {txn.source === 'scan' ? 'Scanned' : 'Manual'}
            </Text>
          </View>
        </Card>

        {hasItems && (
          <>
            <Text style={styles.sectionTitle}>Items</Text>
            <Card padded={false} style={styles.itemsCard}>
              {txn.lineItems!.map((item, i) => (
                <View key={i}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {formatMoney(item.price, txn.currency)}
                    </Text>
                  </View>
                  {i < txn.lineItems!.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.itemRow}>
                <Text style={styles.itemsTotalLabel}>Items total</Text>
                <Text style={styles.itemsTotalValue}>
                  {formatMoney(itemsTotal, txn.currency)}
                </Text>
              </View>
            </Card>
            {itemsTotal !== Math.abs(txn.amount) && (
              <Text style={styles.mismatch}>
                Items don&apos;t add up to the charged total
                {' '}({formatMoney(Math.abs(txn.amount), txn.currency)}).
              </Text>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={saveNote}
          placeholder="Add a description…"
          placeholderTextColor={colors.textFaint}
          multiline
          style={styles.noteInput}
        />
        <Pressable onPress={saveNote} style={styles.saveBtn}>
          <Text style={styles.saveText}>Save description</Text>
        </Pressable>

        <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.negative} />
          <Text style={styles.deleteText}>Delete transaction</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
    title: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    meta: {
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    metaText: {
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    itemsCard: {
      paddingHorizontal: spacing.lg,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    itemName: {
      flex: 1,
      fontSize: fontSize.md,
      color: c.text,
    },
    itemPrice: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: c.text,
      fontVariant: ['tabular-nums'],
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    itemsTotalLabel: {
      flex: 1,
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.text,
    },
    itemsTotalValue: {
      fontSize: fontSize.md,
      fontWeight: '800',
      color: c.text,
      fontVariant: ['tabular-nums'],
    },
    mismatch: {
      fontSize: fontSize.sm,
      color: c.warning,
      marginTop: spacing.sm,
    },
    noteInput: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
      color: c.text,
      minHeight: 96,
      textAlignVertical: 'top',
    },
    saveBtn: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    saveText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      marginTop: spacing.xl,
    },
    deleteText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: c.negative,
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
  });
