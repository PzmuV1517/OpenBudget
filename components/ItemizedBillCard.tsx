import { Ionicons } from '@expo/vector-icons';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';

import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

/** One editable item; price is a raw string while editing. */
export interface EditableItem {
  name: string;
  price: string;
}

interface ItemizedBillCardProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  currency: string;
}

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Collapsible "Use itemized bill" card. Off by default; flipping the switch
 * expands an editable list of detected items (name + price), each correctable.
 */
export function ItemizedBillCard({
  enabled,
  onToggle,
  items,
  onChange,
  currency,
}: ItemizedBillCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  function toggle(next: boolean) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle(next);
  }

  function updateItem(index: number, patch: Partial<EditableItem>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChange([...items, { name: '', price: '' }]);
  }

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => toggle(!enabled)}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Use itemized bill</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>EXPERIMENTAL</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {enabled
              ? `${items.length} item${items.length === 1 ? '' : 's'} — tap to edit`
              : 'Keep each item with its own name and price'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ false: colors.cardAlt, true: colors.accent }}
          thumbColor="#fff"
        />
      </Pressable>

      {enabled && (
        <View style={styles.body}>
          <View style={styles.columns}>
            <Text style={[styles.colLabel, { flex: 1 }]}>Item</Text>
            <Text style={[styles.colLabel, styles.priceCol]}>Price ({currency})</Text>
            <View style={styles.removeSpacer} />
          </View>

          {items.length === 0 && (
            <Text style={styles.empty}>No items yet — add one below.</Text>
          )}

          {items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <TextInput
                value={item.name}
                onChangeText={(name) => updateItem(i, { name })}
                placeholder="Item name"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={item.price}
                onChangeText={(price) => updateItem(i, { price })}
                placeholder="0.00"
                placeholderTextColor={colors.textFaint}
                keyboardType="decimal-pad"
                style={[styles.input, styles.priceCol]}
              />
              <Pressable onPress={() => removeItem(i)} hitSlop={8} style={styles.remove}>
                <Ionicons name="close-circle" size={22} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}

          <Pressable onPress={addItem} style={styles.addRow}>
            <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.addText}>Add item</Text>
          </Pressable>
        </View>
      )}
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
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.text,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.sm,
      backgroundColor: c.warning + '22',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.warning,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: c.warning,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: 2,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    columns: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    colLabel: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: c.textFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    priceCol: {
      width: 96,
      textAlign: 'right',
    },
    removeSpacer: {
      width: 30,
    },
    empty: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      paddingVertical: spacing.md,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    input: {
      backgroundColor: c.cardAlt,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.md,
      color: c.text,
    },
    remove: {
      width: 30,
      alignItems: 'center',
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    addText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.accent,
    },
  });
