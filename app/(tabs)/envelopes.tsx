import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { DualAmount } from '@/components/DualAmount';
import { EnvelopeEditor, type EnvelopeDraft } from '@/components/EnvelopeEditor';
import { ListRow } from '@/components/ListRow';
import type { Envelope } from '@/lib/db/types';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function EnvelopesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const envelopes = useBudget((s) => s.envelopes);
  const currency = useBudget((s) => s.defaultCurrency);
  const addEnvelope = useBudget((s) => s.addEnvelope);
  const updateEnvelope = useBudget((s) => s.updateEnvelope);
  const deleteEnvelope = useBudget((s) => s.deleteEnvelope);

  const [editing, setEditing] = useState<Envelope | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(env: Envelope) {
    setEditing(env);
    setEditorOpen(true);
  }

  function handleSave(draft: EnvelopeDraft) {
    if (editing) {
      updateEnvelope(editing.id, draft);
    } else {
      addEnvelope(draft);
    }
    setEditorOpen(false);
  }

  function handleDelete() {
    if (!editing) return;
    Alert.alert(
      'Delete envelope',
      `Delete "${editing.name}" and all its transactions? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteEnvelope(editing.id);
            setEditorOpen(false);
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {envelopes.length === 0 && (
          <Text style={styles.hint}>
            No envelopes yet. Add your first one below.
          </Text>
        )}

        {envelopes.length > 0 && (
          <Card padded={false} style={styles.card}>
            {envelopes.map((env, i) => (
              <View key={env.id}>
                <ListRow
                  onPress={() => router.push(`/envelope/${env.id}`)}
                  left={<View style={[styles.dot, { backgroundColor: env.color }]} />}
                  title={env.name}
                  right={
                    <View style={styles.rowRight}>
                      <DualAmount minor={env.allocated} currency={env.currency} size="md" />
                      <Pressable
                        onPress={() => openEdit(env)}
                        hitSlop={10}
                        style={styles.editBtn}
                      >
                        <Ionicons name="pencil" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  }
                />
                {i < envelopes.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </Card>
        )}

        <Pressable onPress={openNew} style={styles.addBtn}>
          <Ionicons name="add-circle" size={22} color={colors.accent} />
          <Text style={styles.addText}>Add envelope</Text>
        </Pressable>
      </ScrollView>

      <EnvelopeEditor
        visible={editorOpen}
        envelope={editing}
        currency={currency}
        existingStacks={[
          ...new Set(
            envelopes.map((e) => e.stack?.trim()).filter((s): s is string => !!s)
          ),
        ]}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: spacing.lg,
    },
    hint: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginBottom: spacing.md,
    },
    card: {
      paddingHorizontal: spacing.lg,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    editBtn: {
      padding: spacing.xs,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: radius.pill,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      marginTop: spacing.md,
    },
    addText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.accent,
    },
  });
