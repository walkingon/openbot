const { existsSync } = require("node:fs");
const { join } = require("node:path");

// Android notifications come through Firebase Cloud Messaging, which needs the Firebase file of the
// app. The file is optional, so the app builds before the Firebase project exists, and such a build
// gets no notifications on Android. The file has public identifiers only; the account service has the
// key that sends.
const GOOGLE_SERVICES_FILE = "./google-services.json";
const ANDROID_PACKAGE_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const POSITIVE_INT_RE = /^[1-9][0-9]*$/;

/** @param {Record<string, unknown> | undefined} extra */
function stripEasExtra(extra) {
  if (!extra) return undefined;
  const next = { ...extra };
  delete next.eas;
  return next;
}

/** @param {import('expo/config').ExpoConfig} config */
function applySelfhostOverrides(config) {
  const next = { ...config };
  delete next.owner;

  const extra = stripEasExtra(config.extra);
  if (extra) next.extra = extra;

  const android = { ...config.android };
  const rawPackage = process.env.OPENBOT_ANDROID_PACKAGE?.trim();
  if (rawPackage) {
    if (!ANDROID_PACKAGE_RE.test(rawPackage)) {
      throw new Error(`Invalid OPENBOT_ANDROID_PACKAGE "${rawPackage}".`);
    }
    android.package = rawPackage;
  }

  const rawVersionCode = process.env.OPENBOT_ANDROID_VERSION_CODE?.trim();
  if (rawVersionCode) {
    if (!POSITIVE_INT_RE.test(rawVersionCode)) {
      throw new Error(`Invalid OPENBOT_ANDROID_VERSION_CODE "${rawVersionCode}".`);
    }
    android.versionCode = Number.parseInt(rawVersionCode, 10);
  }

  if (existsSync(join(__dirname, GOOGLE_SERVICES_FILE))) {
    android.googleServicesFile = GOOGLE_SERVICES_FILE;
  }

  const rawAppName = process.env.OPENBOT_ANDROID_APP_NAME?.trim();
  if (rawAppName) {
    next.name = rawAppName;
  }

  return {
    ...next,
    android,
    runtimeVersion: String(config.version ?? "1.0.0"),
    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0,
    },
  };
}

/** @param {{ config: import('expo/config').ExpoConfig }} context */
module.exports = ({ config }) => {
  if (process.env.OPENBOT_SELFHOST_BUILD === "1") {
    return applySelfhostOverrides(config);
  }
  return existsSync(join(__dirname, GOOGLE_SERVICES_FILE))
    ? { ...config, android: { ...config.android, googleServicesFile: GOOGLE_SERVICES_FILE } }
    : config;
};
