import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/useTheme';
import { fontSize, radius, spacing } from '@/lib/theme';

interface EnvelopePillProps {
  name: string;
  color: string;
}

/** Small colored tag identifying which envelope a transaction belongs to. */
export function EnvelopePill({ name, color }: EnvelopePillProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: color + '22' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={[styles.text, { color: colors.text }]}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    maxWidth: 160,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    marginRight: spacing.xs,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
