import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { parseOcr, recognizeImage } from '@/lib/receipt';
import { setPendingScan } from '@/lib/scanHandoff';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const defaultCurrency = useBudget((s) => s.defaultCurrency);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  async function capture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) throw new Error('No image captured');

      const ocr = await recognizeImage(photo.uri);
      const parsed = parseOcr(ocr, { defaultCurrency });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Stash the full parse (incl. raw text) and open the confirm modal. Even
      // when OCR found nothing, the confirm screen lets the user type the total.
      setPendingScan(parsed);
      router.replace('/modal/confirm-scan');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setBusy(false);

      const message = err instanceof Error ? err.message : String(err);
      // ML Kit throws a "not linked" error when the native module is absent
      // (Expo Go / web). Surface that clearly instead of failing silently.
      const isMissingNativeModule =
        Platform.OS === 'web' || /not\s*linked|managed workflow|native/i.test(message);

      Alert.alert(
        'Scan unavailable',
        isMissingNativeModule
          ? 'On-device receipt OCR needs a development build — it does not work in Expo Go or the web preview. You can still enter the amount manually.'
          : `Couldn't read the receipt (${message}). You can enter the amount manually instead.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enter manually',
            onPress: () => router.replace('/add/manual'),
          },
        ]
      );
    }
  }

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color={colors.textFaint} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permHint}>
          OpenBudget scans receipts entirely on your device. No images leave your
          phone.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant camera access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.overlay}>
        <Text style={styles.guide}>Frame the receipt total, then capture.</Text>
      </View>
      <View style={styles.controls}>
        {busy ? (
          <View style={styles.shutter}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <Pressable onPress={capture} style={styles.shutter}>
            <View style={styles.shutterInner} />
          </Pressable>
        )}
        <Text style={styles.busyText}>
          {busy ? 'Reading receipt…' : 'Tap to scan'}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: c.background,
    },
    permTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.md,
    },
    permHint: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    permBtn: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.xl,
    },
    permBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: fontSize.md,
    },
    overlay: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    guide: {
      color: '#fff',
      fontSize: fontSize.sm,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    controls: {
      position: 'absolute',
      bottom: 48,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    shutter: {
      width: 76,
      height: 76,
      borderRadius: radius.pill,
      borderWidth: 4,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterInner: {
      width: 58,
      height: 58,
      borderRadius: radius.pill,
      backgroundColor: '#fff',
    },
    busyText: {
      color: '#fff',
      marginTop: spacing.md,
      fontSize: fontSize.sm,
    },
  });
