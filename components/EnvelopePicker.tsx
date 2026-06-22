import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Envelope } from '@/lib/db/types';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

interface EnvelopePickerProps {
  envelopes: Envelope[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Single-select list of envelopes with a color dot and check mark. */
export function EnvelopePicker({
  envelopes,
  selectedId,
  onSelect,
}: EnvelopePickerProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      {envelopes.map((env, i) => {
        const selected = env.id === selectedId;
        return (
          <Pressable
            key={env.id}
            onPress={() => onSelect(env.id)}
            style={[
              styles.row,
              i < envelopes.length - 1 && styles.divider,
              selected && styles.selected,
            ]}
          >
            <View style={[styles.dot, { backgroundColor: env.color }]} />
            <Text style={styles.name}>{env.name}</Text>
            {selected && (
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.card,
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    divider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    selected: {
      backgroundColor: c.accentSoft,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: radius.pill,
      marginRight: spacing.md,
    },
    name: {
      flex: 1,
      fontSize: fontSize.md,
      fontWeight: '600',
      color: c.text,
    },
  });
