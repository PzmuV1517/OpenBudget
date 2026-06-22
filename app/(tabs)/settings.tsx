import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBudget, type ThemeMode } from '@/lib/store';
import { useTheme, useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, spacing } from '@/lib/theme';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

// A small, common set; the parser still handles any currency it reads.
const CURRENCIES = ['USD', 'EUR', 'GBP', 'RON', 'JPY', 'CHF', 'PLN', 'CAD', 'AUD', 'INR'];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const themeMode = useBudget((s) => s.themeMode);
  const setThemeMode = useBudget((s) => s.setThemeMode);
  const currency = useBudget((s) => s.defaultCurrency);
  const setDefaultCurrency = useBudget((s) => s.setDefaultCurrency);
  const envelopeCount = useBudget((s) => s.envelopes.length);
  const txnCount = useBudget((s) => s.transactions.length);
  const resetAll = useBudget((s) => s.resetAll);

  function confirmReset() {
    Alert.alert(
      'Clear all data',
      'Delete every envelope and transaction? Your theme and currency settings are kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear everything', style: 'destructive', onPress: resetAll },
      ]
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Appearance */}
      <Text style={styles.sectionLabel}>Appearance</Text>
      <View style={styles.card}>
        <Text style={styles.rowTitle}>Theme</Text>
        <View style={styles.segment}>
          {THEME_OPTIONS.map((opt) => {
            const active = opt.mode === themeMode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => setThemeMode(opt.mode)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={active ? '#fff' : colors.textMuted}
                />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Currency */}
      <Text style={styles.sectionLabel}>Default currency</Text>
      <View style={styles.card}>
        <Text style={styles.rowSubtitle}>
          Used for new spending and budgets. Scanned receipts keep their own
          detected currency.
        </Text>
        <View style={styles.chips}>
          {CURRENCIES.map((code) => {
            const active = code === currency;
            return (
              <Pressable
                key={code}
                onPress={() => setDefaultCurrency(code)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {code}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Data */}
      <Text style={styles.sectionLabel}>Data</Text>
      <View style={styles.card}>
        <View style={styles.statsRow}>
          <Stat value={envelopeCount} label="Envelopes" styles={styles} />
          <Stat value={txnCount} label="Transactions" styles={styles} />
        </View>
        <Pressable onPress={confirmReset} style={styles.dangerBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.negative} />
          <Text style={styles.dangerText}>Clear all data</Text>
        </Pressable>
      </View>

      {/* About */}
      <Text style={styles.sectionLabel}>About</Text>
      <View style={styles.card}>
        <Row label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} styles={styles} />
        <View style={styles.divider} />
        <Row label="Storage" value="On-device only" styles={styles} />
        <View style={styles.divider} />
        <Row label="Network" value="Fully offline" styles={styles} />
      </View>

      <Text style={styles.footer}>
        OpenBudget keeps everything on your device. No accounts, no cloud, no
        tracking.
      </Text>
    </ScrollView>
  );
}

function Stat({
  value,
  label,
  styles,
}: {
  value: number;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: c.textFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.lg,
    },
    rowTitle: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: c.text,
      marginBottom: spacing.md,
    },
    rowSubtitle: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginBottom: spacing.md,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.cardAlt,
      borderRadius: radius.md,
      padding: 4,
      gap: 4,
    },
    segmentItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
    },
    segmentItemActive: {
      backgroundColor: c.accent,
    },
    segmentText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: c.textMuted,
    },
    segmentTextActive: {
      color: '#fff',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    chipActive: {
      backgroundColor: c.accentSoft,
      borderColor: c.accent,
    },
    chipText: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: c.textMuted,
    },
    chipTextActive: {
      color: c.accent,
    },
    statsRow: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
    },
    statValue: {
      fontSize: fontSize.xxl,
      fontWeight: '800',
      color: c.text,
    },
    statLabel: {
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
    dangerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.negative,
    },
    dangerText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.negative,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    infoLabel: {
      fontSize: fontSize.md,
      color: c.text,
    },
    infoValue: {
      fontSize: fontSize.md,
      color: c.textMuted,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    footer: {
      fontSize: fontSize.xs,
      color: c.textFaint,
      textAlign: 'center',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
  });
