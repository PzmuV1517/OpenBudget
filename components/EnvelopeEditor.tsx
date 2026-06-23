import { useEffect, useState } from 'react';
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

import { CurrencyChips } from './CurrencyChips';
import type { Envelope } from '@/lib/db/types';
import { toMajorUnits, toMinorUnits } from '@/lib/money';
import { normalizeAmount } from '@/lib/receipt';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, envelopePalette, fontSize, radius, spacing } from '@/lib/theme';

export interface EnvelopeDraft {
  name: string;
  allocated: number; // minor units
  color: string;
  stack: string | null;
  currency: string;
}

interface EnvelopeEditorProps {
  visible: boolean;
  /** Existing envelope to edit, or null to create a new one. */
  envelope: Envelope | null;
  /** Default currency for new envelopes. */
  currency: string;
  /** Existing stack names, offered as quick-pick chips. */
  existingStacks: string[];
  onClose: () => void;
  onSave: (draft: EnvelopeDraft) => void;
  onDelete?: () => void;
}

export function EnvelopeEditor({
  visible,
  envelope,
  currency,
  existingStacks,
  onClose,
  onSave,
  onDelete,
}: EnvelopeEditorProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [color, setColor] = useState<string>(envelopePalette[0]);
  const [stack, setStack] = useState('');
  const [curr, setCurr] = useState(currency);

  // Re-seed the form whenever the target envelope changes.
  useEffect(() => {
    if (!visible) return;
    const c = envelope?.currency ?? currency;
    setName(envelope?.name ?? '');
    setColor(envelope?.color ?? envelopePalette[0]);
    setStack(envelope?.stack ?? '');
    setCurr(c);
    setAmount(envelope ? String(toMajorUnits(envelope.allocated, c)) : '');
  }, [visible, envelope, currency]);

  const parsed = normalizeAmount(amount || '0');
  const valid = name.trim().length > 0 && parsed !== null && parsed >= 0;

  function handleSave() {
    if (!valid || parsed === null) return;
    onSave({
      name: name.trim(),
      allocated: toMinorUnits(parsed, curr),
      color,
      stack: stack.trim() || null,
      currency: curr,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>
              {envelope ? 'Edit envelope' : 'New envelope'}
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Groceries"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoFocus={!envelope}
            />

            <Text style={styles.label}>Currency</Text>
            <CurrencyChips value={curr} onChange={setCurr} />

            <Text style={styles.label}>Allocation ({curr})</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Color</Text>
            <View style={styles.swatches}>
              {envelopePalette.map((sw) => (
                <Pressable
                  key={sw}
                  onPress={() => setColor(sw)}
                  style={[
                    styles.swatch,
                    { backgroundColor: sw },
                    color === sw && { borderColor: colors.text },
                  ]}
                />
              ))}
            </View>

            <Text style={styles.label}>Stack (optional)</Text>
            <TextInput
              value={stack}
              onChangeText={setStack}
              placeholder="e.g. Cash"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
            {existingStacks.length > 0 && (
              <View style={styles.stackChips}>
                {existingStacks.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setStack(stack.trim() === s ? '' : s)}
                    style={[
                      styles.stackChip,
                      stack.trim() === s && {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stackChipText,
                        stack.trim() === s && { color: colors.accent },
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={styles.stackHint}>
              Envelopes sharing a stack name merge into one card on the home
              screen, but stay separate for spending.
            </Text>

            <Pressable
              onPress={handleSave}
              disabled={!valid}
              style={[styles.saveBtn, !valid && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveText}>
                {envelope ? 'Save changes' : 'Create envelope'}
              </Text>
            </Pressable>

            {envelope && onDelete && (
              <Pressable onPress={onDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete envelope</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    backdropPress: {
      flex: 1,
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      maxHeight: '85%',
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.border,
      marginBottom: spacing.md,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: '800',
      color: c.text,
      marginBottom: spacing.md,
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
      fontSize: fontSize.lg,
      color: c.text,
    },
    swatches: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    stackChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    stackChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    stackChipText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: c.textMuted,
    },
    stackHint: {
      fontSize: fontSize.xs,
      color: c.textFaint,
      marginTop: spacing.sm,
    },
    swatch: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    saveBtn: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    saveBtnDisabled: {
      opacity: 0.4,
    },
    saveText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    deleteBtn: {
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    deleteText: {
      color: c.negative,
      fontSize: fontSize.md,
      fontWeight: '600',
    },
  });
