#!/usr/bin/env bash
#
# Build a standalone (server-less) OpenBudget APK and install it over adb.
#
#   ./scripts/install-android.sh            # release build (default)
#   ./scripts/install-android.sh debug      # debug build
#
# The release APK embeds the JS bundle, so the app runs without a Metro server.
set -euo pipefail

# --- locate project root (this script lives in <root>/scripts) ----------------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VARIANT="${1:-release}"
if [[ "$VARIANT" != "release" && "$VARIANT" != "debug" ]]; then
  echo "Usage: $0 [release|debug]" >&2
  exit 1
fi

# --- find the Android SDK -----------------------------------------------------
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
if [[ ! -d "$SDK" ]]; then
  echo "✗ Android SDK not found. Set ANDROID_HOME or install the SDK." >&2
  exit 1
fi
ADB="$SDK/platform-tools/adb"
command -v "$ADB" >/dev/null 2>&1 || ADB="adb"

# --- ensure the native android/ project exists -------------------------------
if [[ ! -d android ]]; then
  echo "▸ No android/ project — running expo prebuild…"
  npx expo prebuild --platform android
fi

# point Gradle at the SDK if it isn't already
if [[ ! -f android/local.properties ]]; then
  echo "sdk.dir=$SDK" > android/local.properties
  echo "▸ Wrote android/local.properties → $SDK"
fi

# --- require a connected device / emulator -----------------------------------
DEVICES="$("$ADB" devices | grep -cw "device" || true)"
if [[ "$DEVICES" -eq 0 ]]; then
  echo "✗ No Android device/emulator detected (check 'adb devices' and USB debugging)." >&2
  exit 1
fi

# --- build --------------------------------------------------------------------
if [[ "$VARIANT" == "release" ]]; then
  GRADLE_TASK="assembleRelease"
  APK="android/app/build/outputs/apk/release/app-release.apk"
else
  GRADLE_TASK="assembleDebug"
  APK="android/app/build/outputs/apk/debug/app-debug.apk"
fi

echo "▸ Building $VARIANT APK ( ./gradlew $GRADLE_TASK )…"
( cd android && ./gradlew "$GRADLE_TASK" )

if [[ ! -f "$APK" ]]; then
  echo "✗ Build finished but APK not found at $APK" >&2
  exit 1
fi

# --- install ------------------------------------------------------------------
echo "▸ Installing $APK …"
"$ADB" install -r "$APK"

echo "✓ Installed. Launch OpenBudget on your device — no server needed."
