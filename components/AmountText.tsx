import { StyleSheet, Text, TextStyle } from 'react-native';

import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/useTheme';
import { fontSize } from '@/lib/theme';

interface AmountTextProps {
  /** Integer minor units. */
  minor: number;
  currency?: string;
  size?: keyof typeof fontSize;
  /** Color by sign: spends red, top-ups green, neutral default. */
  colorBySign?: boolean;
  muted?: boolean;
  style?: TextStyle | TextStyle[];
}

/** Renders integer minor units as a localized currency string. */
export function AmountText({
  minor,
  currency = 'USD',
  size = 'md',
  colorBySign = false,
  muted = false,
  style,
}: AmountTextProps) {
  const { colors } = useTheme();
  let color: string = muted ? colors.textMuted : colors.text;
  if (colorBySign && minor !== 0) {
    color = minor < 0 ? colors.negative : colors.positive;
  }
  const text = formatMoney(minor, currency);
  const display = colorBySign && minor > 0 ? `+${text}` : text;
  return (
    <Text style={[styles.base, { fontSize: fontSize[size], color }, style]}>
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
