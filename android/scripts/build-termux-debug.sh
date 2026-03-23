#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
SDK_DIR="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
BUILD_TOOLS_VERSION="${ANYCLAW_ANDROID_BUILD_TOOLS:-34.0.0}"
PLATFORM_VERSION="${ANYCLAW_ANDROID_PLATFORM:-android-34}"
AAPT2_OVERRIDE="$SDK_DIR/build-tools/$BUILD_TOOLS_VERSION/aapt2"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
DOWNLOAD_TARGET="${ANYCLAW_DEBUG_APK_TARGET:-/storage/emulated/0/Download/anyclaw-debug.apk}"

log() {
  printf "\n==> %s\n" "$1"
}

die() {
  printf "\n[ERROR] %s\n" "$1" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

need_cmd java
need_cmd javac
need_cmd node
need_cmd npm
need_cmd unzip
need_cmd wget

export JAVA_HOME="${JAVA_HOME:-$(cd "$(dirname "$(command -v javac)")/.." && pwd)}"
export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$JAVA_HOME/bin:$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

need_cmd sdkmanager

mkdir -p "$SDK_DIR/cmdline-tools"

if [ ! -d "$SDK_DIR/cmdline-tools/latest" ]; then
  log "Installing Android command-line tools"
  cd "$SDK_DIR"
  archive="commandlinetools-linux-13114758_latest.zip"
  [ -f "$archive" ] || wget -q "https://dl.google.com/android/repository/$archive"
  rm -rf "$SDK_DIR/cmdline-tools/latest" "$SDK_DIR/cmdline-tools/cmdline-tools"
  unzip -q "$archive" -d "$SDK_DIR/cmdline-tools"
  mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
fi

log "Ensuring Android SDK packages"
yes | sdkmanager --licenses >/dev/null
sdkmanager "platform-tools" "platforms;$PLATFORM_VERSION" "build-tools;$BUILD_TOOLS_VERSION"

[ -x "$AAPT2_OVERRIDE" ] || die "AAPT2 not found at $AAPT2_OVERRIDE"

log "Installing npm dependencies"
cd "$ROOT_DIR"
npm install

log "Building frontend"
npm run build:frontend

log "Building CLI"
npm run build:cli

log "Downloading bootstrap"
cd "$ANDROID_DIR"
bash scripts/download-bootstrap.sh

log "Bundling server assets"
bash scripts/build-server-bundle.sh

printf 'sdk.dir=%s\n' "$SDK_DIR" > "$ANDROID_DIR/local.properties"

log "Stopping old Gradle daemons"
./gradlew --stop >/dev/null 2>&1 || true

log "Compiling debug resources with Termux-safe aapt2"
./gradlew -Pandroid.aapt2FromMavenOverride="$AAPT2_OVERRIDE" :app:compileDebugKotlin

log "Building debug APK"
./gradlew -Pandroid.aapt2FromMavenOverride="$AAPT2_OVERRIDE" assembleDebug

[ -f "$APK_PATH" ] || die "APK not found: $APK_PATH"

if [ -d "$(dirname "$DOWNLOAD_TARGET")" ]; then
  cp -f "$APK_PATH" "$DOWNLOAD_TARGET"
  log "Copied APK to $DOWNLOAD_TARGET"
fi

printf '\nAPK: %s\n' "$APK_PATH"

