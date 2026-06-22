import { ReactNode } from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { useThemedStyles } from '@/lib/useTheme';
import { type AppColors, radius, shadow, spacing } from '@/lib/theme';

interface CardProps extends ViewProps {
  children: ReactNode;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/** Rounded, subtly-shadowed surface — the base container for everything. */
export function Card({ children, padded = true, style, ...rest }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...shadow.card,
    },
    padded: {
      padding: spacing.lg,
    },
  });
