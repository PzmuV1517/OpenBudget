import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  onManual: () => void;
  onScan: () => void;
  onGallery: () => void;
}

/** Bottom action sheet shown by the FAB: enter manually, scan, or pick a photo. */
export function AddSheet({ visible, onClose, onManual, onScan, onGallery }: AddSheetProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Option
            icon="create-outline"
            label="Enter manually"
            hint="Type an amount and pick an envelope"
            onPress={onManual}
            styles={styles}
          />
          <Option
            icon="camera-outline"
            label="Scan receipt"
            hint="Capture a receipt and parse the total on-device"
            onPress={onScan}
            styles={styles}
          />
          <Option
            icon="image-outline"
            label="Use photo from gallery"
            hint="Pick an existing receipt photo and parse it on-device"
            onPress={onGallery}
            styles={styles}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  icon,
  label,
  hint,
  onPress,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.cardAlt }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.border,
      marginBottom: spacing.md,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    optionLabel: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.text,
    },
    optionHint: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: 2,
    },
  });
