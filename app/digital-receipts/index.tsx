import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  hasNotificationAccess,
  isCaptureAvailable,
  openNotificationAccessSettings,
  setMonitoredPackages,
  setMonitoringEnabled,
} from '@/lib/notificationReader';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function DigitalReceiptsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const enabled = useBudget((s) => s.drEnabled);
  const apps = useBudget((s) => s.drApps);
  const configuredOnce = useBudget((s) => s.drConfiguredOnce);
  const setDrEnabled = useBudget((s) => s.setDrEnabled);

  // Show the explainer every visit until the feature has been fully set up once.
  const [showExplanation, setShowExplanation] = useState(!configuredOnce);
  const [access, setAccess] = useState(false);

  // On focus: re-check access, and re-push the watch-list to the native filter
  // so it always matches the saved selection (covers configuring in a build
  // where the native module wasn't present, then returning in the dev build).
  useFocusEffect(
    useCallback(() => {
      setAccess(hasNotificationAccess());
      // Keep the native state in sync with the saved selection.
      setMonitoringEnabled(enabled);
      setMonitoredPackages(enabled ? apps : []);
    }, [enabled, apps])
  );

  async function onToggle(next: boolean) {
    setDrEnabled(next);
    setMonitoringEnabled(next);
    if (next) {
      // Android 13+ needs the runtime POST_NOTIFICATIONS permission to prompt.
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        try {
          await PermissionsAndroid.request(
            'android.permission.POST_NOTIFICATIONS' as Parameters<
              typeof PermissionsAndroid.request
            >[0]
          );
        } catch {
          // ignore — capture still works, the prompt notification may not show
        }
      }
      setMonitoredPackages(apps); // selection is package names now
      // Need access before any apps can be discovered.
      if (!hasNotificationAccess()) openNotificationAccessSettings();
    } else {
      setMonitoredPackages([]);
    }
  }

  if (showExplanation) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.explainContent}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="notifications" size={40} color={colors.accent} />
        </View>
        <Text style={styles.explainTitle}>Read digital receipts</Text>
        <Text style={styles.explainLead}>
          Automatically catch spending you make through payment and banking apps —
          no scanning, no typing.
        </Text>

        <Step
          styles={styles}
          icon="ear-outline"
          title="It listens to your notifications"
          body="When an app you choose posts a payment notification, OpenBudget reads it on-device."
        />
        <Step
          styles={styles}
          icon="cash-outline"
          title="It picks out how much you spent"
          body="The amount (and merchant, when present) is parsed from the notification text."
        />
        <Step
          styles={styles}
          icon="add-circle-outline"
          title="It prompts you to add the spending"
          body="You get OpenBudget's own notification with the amount, ready to file into an envelope."
        />

        <View style={styles.noteCard}>
          <Ionicons name="flask-outline" size={18} color={colors.warning} />
          <Text style={styles.noteText}>
            Experimental: reading other apps&apos; notifications needs a one-time
            Android permission and a development build. Everything stays on your
            device.
          </Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => setShowExplanation(false)}>
          <Text style={styles.primaryText}>Got it</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Enable */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.rowTitle}>Monitor notifications</Text>
            <Text style={styles.rowSubtitle}>
              Discover the apps that notify you, then pick receipt sources
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.cardAlt, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {!isCaptureAvailable && (
        <View style={styles.warnCard}>
          <Ionicons name="construct-outline" size={18} color={colors.warning} />
          <Text style={styles.warnText}>
            Capture isn&apos;t available in this build. Rebuild the Android dev
            client to enable notification reading.
          </Text>
        </View>
      )}

      {isCaptureAvailable && enabled && !access && (
        <Pressable style={styles.warnCard} onPress={openNotificationAccessSettings}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
          <Text style={styles.warnText}>
            Notification access not granted. Tap to open Android settings and turn
            on OpenBudget.
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.warning} />
        </Pressable>
      )}

      {/* Ledger */}
      <Pressable
        style={styles.card}
        onPress={() => router.push('/digital-receipts/ledger')}
      >
        <View style={styles.linkRow}>
          <Ionicons name="receipt-outline" size={22} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Digital receipt ledger</Text>
            <Text style={styles.rowSubtitle}>Captured payments waiting to be filed</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </View>
      </Pressable>

      {/* Monitored apps — only opens when enabled */}
      <Pressable
        style={[styles.card, !enabled && styles.cardDisabled]}
        disabled={!enabled}
        onPress={() => router.push('/digital-receipts/apps')}
      >
        <View style={styles.linkRow}>
          <Ionicons
            name="apps-outline"
            size={22}
            color={enabled ? colors.accent : colors.textFaint}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, !enabled && styles.textFaint]}>
              Receipt sources
            </Text>
            <Text style={styles.rowSubtitle}>
              {enabled
                ? apps.length > 0
                  ? `${apps.length} source${apps.length === 1 ? '' : 's'} selected`
                  : 'Pick from the apps that notify you'
                : 'Turn on monitoring to choose sources'}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={enabled ? colors.textFaint : colors.cardAlt}
          />
        </View>
      </Pressable>
    </ScrollView>
  );
}

function Step({
  styles,
  icon,
  title,
  body,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>
        <Ionicons name={icon} size={22} color={styles._accent.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    _accent: { color: c.accent },
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    explainContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    heroIcon: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      borderRadius: radius.pill,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
    },
    explainTitle: {
      fontSize: fontSize.xxl,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    explainLead: {
      fontSize: fontSize.md,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    step: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    stepIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepTitle: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.text,
    },
    stepBody: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: 2,
    },
    noteCard: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: c.warning + '14',
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.warning,
      padding: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    noteText: {
      flex: 1,
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
    primaryBtn: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    primaryText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.lg,
    },
    cardDisabled: {
      opacity: 0.55,
    },
    warnCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.warning + '14',
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.warning,
      padding: spacing.md,
    },
    warnText: {
      flex: 1,
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowTitle: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.text,
    },
    rowSubtitle: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: 2,
    },
    textFaint: {
      color: c.textFaint,
    },
  });
