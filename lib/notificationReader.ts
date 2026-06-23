/**
 * Typed wrapper over the local `notification-reader` native module (Android).
 * Degrades to no-ops everywhere the module is absent (web preview, Expo Go, iOS)
 * so the UI keeps working — real capture only activates in the Android dev build.
 */
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export interface SeenApp {
  pkg: string;
  label: string;
  count: number;
  lastSeen: number;
}

export interface NativeReceipt {
  pkg: string;
  app?: string;
  title: string;
  text: string;
  amountText: string | null;
  timestamp: number;
}

interface NativeModule {
  hasAccess(): boolean;
  openSettings(): void;
  setEnabled(enabled: boolean): void;
  setMonitoredPackages(packages: string[]): void;
  getSeenAppsJson(): string;
  clearSeenApps(): void;
  getCapturedJson(): string;
  clearCaptured(): void;
  addListener(event: string, cb: (r: NativeReceipt) => void): { remove(): void };
}

let native: NativeModule | null = null;
try {
  if (Platform.OS === 'android') {
    native = requireNativeModule('NotificationReader') as unknown as NativeModule;
  }
} catch {
  native = null; // not in this build (Expo Go, etc.)
}

/** Whether the native capture module is present in this build. */
export const isCaptureAvailable = native != null;

export function hasNotificationAccess(): boolean {
  try {
    return native?.hasAccess() ?? false;
  } catch {
    return false;
  }
}

export function openNotificationAccessSettings(): void {
  native?.openSettings();
}

export function setMonitoringEnabled(enabled: boolean): void {
  native?.setEnabled(enabled);
}

export function setMonitoredPackages(packages: string[]): void {
  native?.setMonitoredPackages(packages);
}

/** Apps that have notified you since monitoring started, newest activity first. */
export function getSeenApps(): SeenApp[] {
  if (!native) return [];
  try {
    const apps: SeenApp[] = JSON.parse(native.getSeenAppsJson() || '[]');
    return apps.sort((a, b) => b.lastSeen - a.lastSeen);
  } catch {
    return [];
  }
}

export function clearSeenApps(): void {
  native?.clearSeenApps();
}

export function getCapturedReceipts(): NativeReceipt[] {
  if (!native) return [];
  try {
    return JSON.parse(native.getCapturedJson() || '[]');
  } catch {
    return [];
  }
}

export function clearCapturedReceipts(): void {
  native?.clearCaptured();
}

export function addCaptureListener(cb: (r: NativeReceipt) => void): { remove(): void } {
  if (!native) return { remove() {} };
  return native.addListener('onCapture', cb);
}
