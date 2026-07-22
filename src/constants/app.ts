// Single source of truth for the app version.
//
// package.json "version" is THE version. android/app/build.gradle reads the same file for
// versionName (and derives versionCode from it), so the Settings screen and the Android
// build can never drift apart. To ship a new build, bump only package.json.
import { version } from '../../package.json';

export const APP_VERSION: string = version;
