import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  type SeenApp,
  getSeenApps,
  hasNotificationAccess,
  isCaptureAvailable,
  setMonitoredPackages,
} from '@/lib/notificationReader';
import { useBudget } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

export default function MonitoredAppsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const selected = useBudget((s) => s.drApps); // package names
  const setDrApps = useBudget((s) => s.setDrApps);

  const [seen, setSeen] = useState<SeenApp[]>([]);
  const [access, setAccess] = useState(false);

  const refresh = useCallback(() => {
    setSeen(getSeenApps());
    setAccess(hasNotificationAccess());
  }, []);

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  function toggle(pkg: string) {
    const next = selected.includes(pkg)
      ? selected.filter((p) => p !== pkg)
      : [...selected, pkg];
    setDrApps(next);
    setMonitoredPackages(next);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Receipt sources',
          headerRight: () => (
            <Pressable onPress={refresh} hitSlop={8}>
              <Ionicons name="refresh" size={20} color={colors.accent} />
            </Pressable>
          ),
        }}
      />

      <Text style={styles.lead}>
        These are the apps that have sent you notifications since monitoring
        turned on. Pick the ones you want OpenBudget to read receipts from.
      </Text>

      {!access && isCaptureAvailable && (
        <View style={styles.warn}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.warning} />
          <Text style={styles.warnText}>
            Notification access isn&apos;t granted yet, so nothing can be
            discovered. Grant it on the previous screen.
          </Text>
        </View>
      )}

      {seen.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="scan-outline" size={40} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>No apps discovered yet</Text>
          <Text style={styles.emptyBody}>
            {isCaptureAvailable
              ? 'Keep monitoring on and use your phone for a bit — apps that notify you will show up here. Pull the refresh icon to update.'
              : 'Discovery needs the Android dev build with notification access.'}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {seen.map((app, i) => {
            const on = selected.includes(app.pkg);
            return (
              <Pressable key={app.pkg} onPress={() => toggle(app.pkg)}>
                <View style={styles.row}>
                  <View style={styles.appIcon}>
                    <Ionicons name="apps-outline" size={20} color={colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {app.label || app.pkg}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {app.count} notification{app.count === 1 ? '' : 's'} ·{' '}
                      {formatDistanceToNow(new Date(app.lastSeen), { addSuffix: true })}
                    </Text>
                  </View>
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={on ? colors.accent : colors.textFaint}
                  />
                </View>
                {i < seen.length - 1 && <View style={styles.divider} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {selected.length > 0 && (
        <Text style={styles.hint}>
          {selected.length} source{selected.length === 1 ? '' : 's'} selected.
        </Text>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    lead: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginBottom: spacing.lg,
    },
    warn: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      backgroundColor: c.warning + '14',
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.warning,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    warnText: { flex: 1, fontSize: fontSize.sm, color: c.textMuted },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    appIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: { fontSize: fontSize.md, fontWeight: '600', color: c.text },
    meta: { fontSize: fontSize.xs, color: c.textFaint, marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.md,
    },
    emptyBody: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.lg,
    },
    hint: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
