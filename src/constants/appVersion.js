// Version shown in the app, read from the installed build so it can never
// drift from app.json "version" (versionName) and the EAS-managed
// versionCode. Previously "v1.0.3" was typed into four screens by hand.
import * as Application from 'expo-application';

const version = Application.nativeApplicationVersion || '';
const build   = Application.nativeBuildVersion || '';

// e.g. "v1.0.3"
export const APP_VERSION = version ? `v${version}` : '';

// e.g. "v1.0.3 (12)": the build number in brackets helps support match a
// report to the exact Play upload.
export const APP_VERSION_FULL = version ? `v${version}${build ? ` (${build})` : ''}` : '';
