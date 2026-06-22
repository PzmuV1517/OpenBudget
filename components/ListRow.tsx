import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, spacing } from '@/lib/theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Rendered on the right (e.g. an AmountText). */
  right?: ReactNode;
  /** Rendered on the left (e.g. an icon or color dot). */
  left?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

/** Generic tappable row: optional left slot, title/subtitle, right slot. */
export function ListRow({
  title,
  subtitle,
  right,
  left,
  onPress,
  showChevron = false,
}: ListRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const body = (
    <View style={styles.row}>
      {left != null && <View style={styles.left}>{left}</View>}
      <View style={styles.center}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle != null && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        {right}
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textFaint}
            style={{ marginLeft: spacing.xs }}
          />
        )}
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {body}
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    left: {
      marginRight: spacing.md,
    },
    center: {
      flex: 1,
      marginRight: spacing.sm,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: c.text,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: 2,
    },
  });
