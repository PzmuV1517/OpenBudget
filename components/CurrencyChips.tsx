import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { CURRENCIES } from '@/lib/currencies';
import { useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

interface CurrencyChipsProps {
  value: string;
  onChange: (currency: string) => void;
}

/** Horizontal scroll of currency codes; the current value is always included. */
export function CurrencyChips({ value, onChange }: CurrencyChipsProps) {
  const styles = useThemedStyles(makeStyles);
  const list = CURRENCIES.includes(value) ? CURRENCIES : [value, ...CURRENCIES];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {list.map((c) => {
        const active = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{c}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      gap: spacing.sm,
      paddingVertical: 2,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    chipActive: {
      backgroundColor: c.accentSoft,
      borderColor: c.accent,
    },
    text: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: c.textMuted,
    },
    textActive: {
      color: c.accent,
    },
  });
