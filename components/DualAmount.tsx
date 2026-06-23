import { StyleSheet, Text, TextStyle, View } from 'react-native';

import { AmountText } from './AmountText';
import { formatMoney } from '@/lib/money';
import { useConvert } from '@/lib/useConvert';
import { useTheme } from '@/lib/useTheme';
import { fontSize } from '@/lib/theme';

interface DualAmountProps {
  /** Integer minor units, in `currency`. */
  minor: number;
  currency: string;
  size?: keyof typeof fontSize;
  colorBySign?: boolean;
  align?: 'left' | 'right';
  primaryStyle?: TextStyle | TextStyle[];
}

/**
 * Shows an amount in its own currency, plus a smaller converted line in the
 * default currency when they differ. If the currency already matches the
 * default, only one line is shown.
 */
export function DualAmount({
  minor,
  currency,
  size = 'md',
  colorBySign = false,
  align = 'right',
  primaryStyle,
}: DualAmountProps) {
  const { colors } = useTheme();
  const { convert, defaultCurrency } = useConvert();
  const showSecondary = currency.toUpperCase() !== defaultCurrency.toUpperCase();
  const converted = showSecondary ? convert(minor, currency, defaultCurrency) : 0;

  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <AmountText
        minor={minor}
        currency={currency}
        size={size}
        colorBySign={colorBySign}
        style={primaryStyle}
      />
      {showSecondary && (
        <Text style={[styles.secondary, { color: colors.textFaint }]}>
          ≈ {formatMoney(converted, defaultCurrency)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secondary: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 1,
  },
});
