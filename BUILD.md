# Building Tally — Zero to APK (step-by-step)

This guide takes a **completely fresh machine** and a GitHub link, and ends with an
**installable Android APK** (and a Play Store `.aab`). No prior React Native experience needed.
Just follow the steps in order and copy–paste the commands.

> Tally is an **offline** Android app (React Native CLI, no iOS). You build it on **Windows,
> macOS, or Linux**. Where a step differs per OS, it says so.

---

## 0. What you'll end up with

- A file `app-release.apk` you can copy to an Android phone and install.
- (Optional) `app-release.aab` for uploading to Google Play.

The whole thing is: **install tools once → get the code → install project packages → run one build command.**

---

## 1. Install the tools (one-time setup)

You need **four** things: Node.js, Java (JDK 17), the Android SDK, and Git.

### 1a. Git

- **Windows:** download from https://git-scm.com/download/win and install (defaults are fine).
- **macOS:** `xcode-select --install` (or install from https://git-scm.com/).
- **Linux (Debian/Ubuntu):** `sudo apt-get install -y git`

Check: `git --version`

### 1b. Node.js 20 (LTS)

Install **Node.js 20.x** (the project requires Node ≥ 20).

- Easiest cross-platform way is **nvm**:
  - macOS/Linux: install nvm from https://github.com/nvm-sh/nvm, then:
    ```bash
    nvm install 20
    nvm use 20
    ```
  - Windows: install **nvm-windows** from https://github.com/coreybutler/nvm-windows, then:
    ```powershell
    nvm install 20
    nvm use 20
    ```
- Or download the "LTS" installer from https://nodejs.org/.

Check: `node -v` (should print `v20.x.x`) and `npm -v`.

### 1c. Java JDK 17

React Native 0.81 needs **JDK 17** (not 11, not 21).

- **Windows/macOS/Linux:** install **Eclipse Temurin 17** from https://adoptium.net/temurin/releases/?version=17
  (pick JDK 17, your OS).
- macOS with Homebrew: `brew install --cask temurin@17`
- Linux (Debian/Ubuntu): `sudo apt-get install -y openjdk-17-jdk`

Check: `java -version` (should say `17.x`).

### 1d. Android Studio + the Android SDK

1. Download and install **Android Studio**: https://developer.android.com/studio
2. Open Android Studio → on the welcome screen open **More Actions → SDK Manager**
   (or **Settings → Languages & Frameworks → Android SDK**).
3. In the **SDK Platforms** tab, tick:
   - **Android 16 (API 36)** ← this project compiles against API 36
4. Switch to the **SDK Tools** tab, click **"Show Package Details"**, and tick these **exact** versions:
   - **Android SDK Build-Tools** → `36.0.0`
   - **NDK (Side by side)** → `27.1.12297006`  ← required (the SQLite library compiles native C++)
   - **CMake** → `3.22.1` (or the latest offered)
   - **Android SDK Platform-Tools**
   - **Android SDK Command-line Tools (latest)**
   - **Android Emulator** (only if you want to run it on a virtual phone)
5. Click **Apply** and let it download.

### 1e. Tell your system where the Android SDK is (environment variables)

Find your SDK path (shown at the top of the SDK Manager). It's usually:
- **Windows:** `C:\Users\<you>\AppData\Local\Android\Sdk`
- **macOS:** `/Users/<you>/Library/Android/sdk`
- **Linux:** `/home/<you>/Android/Sdk`

Now set `ANDROID_HOME` and add the tools to your `PATH`:

**Windows (PowerShell, run once):**
```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx PATH "$env:PATH;$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```
Close and reopen the terminal after running `setx`.

**macOS/Linux (add to `~/.zshrc` or `~/.bashrc`, then restart the terminal):**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk      # macOS
# export ANDROID_HOME=$HOME/Android/Sdk            # Linux (use this line instead)
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

Check: `adb --version` prints something (means PATH is right).

### 1f. Accept the Android SDK licenses

Run once (answer `y` to all):
```bash
sdkmanager --licenses
```
> If `sdkmanager` isn't found, it lives in
> `$ANDROID_HOME/cmdline-tools/latest/bin/` — either add that to PATH or run it with the full path.

---

## 2. Get the code

Replace `<REPO_URL>` with the GitHub link you were given.

```bash
git clone <REPO_URL> tally-app
cd tally-app
```

> **Important:** the React Native app lives on the **`rn-cli-migration`** branch (the old Expo
> version is on `main`). If it hasn't been merged to `main` yet, switch to it:
> ```bash
> git checkout rn-cli-migration
> ```
> To confirm you're on the right one, check that a `BUILD.md` and an `android/` folder exist:
> `ls android` should list `app`, `build.gradle`, `gradlew`, …

---

## 3. Install the project's packages

```bash
npm install --legacy-peer-deps
```
This downloads all the libraries (a few hundred MB, one time). The `--legacy-peer-deps` flag is
required for this project.

---

## 4. Point the build at your SDK

Create a file at **`android/local.properties`** containing your SDK path:

**Windows** (note the double backslashes):
```
sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
```
**macOS:**
```
sdk.dir=/Users/<you>/Library/Android/sdk
```
**Linux:**
```
sdk.dir=/home/<you>/Android/Sdk
```
> If `ANDROID_HOME` is already set (step 1e), Gradle can usually find the SDK without this file —
> but creating it avoids the most common "SDK location not found" error.

---

## 5. Build the installable APK  ← the main goal

From the **project root**:

**macOS/Linux:**
```bash
cd android
./gradlew assembleRelease
cd ..
```
**Windows (PowerShell):**
```powershell
cd android
.\gradlew.bat assembleRelease
cd ..
```

The **first** build downloads Gradle + compiles native code, so it can take **5–15 minutes**.
Later builds are much faster.

When it finishes with `BUILD SUCCESSFUL`, your APK is here:

```
android/app/build/outputs/apk/release/app-release.apk
```

This APK is **standalone** (the JavaScript is bundled inside) and is signed with the project's
debug key, so you can install and run it immediately — no Metro server needed.

> There's also a shortcut from the project root: `npm run apk:android` (same result).

### Install it on a phone

1. On the phone: **Settings → About phone → tap "Build number" 7 times** to enable Developer options,
   then **Settings → Developer options → enable "USB debugging."**
2. Plug the phone into the computer, accept the "Allow USB debugging?" prompt.
3. From the project root:
   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```
   (or just copy the `.apk` file to the phone and tap it, allowing "install from this source").

---

## 6. (Optional) Run it in development mode

Only needed if you want live-reload while changing code:

```bash
npm start          # terminal 1: starts Metro (leave running)
npm run android    # terminal 2: builds a debug app onto a connected device/emulator
```
> To use an emulator: Android Studio → **Device Manager → Create device** → start it, then run `npm run android`.

---

## 7. Build for Google Play (signed AAB)

Google Play needs an **App Bundle (`.aab`)** signed with **your own** key (not the debug key).

### 7a. Create your upload keystore (do this once, keep it forever & back it up)

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore tally-upload.keystore \
  -alias tally-upload -keyalg RSA -keysize 2048 -validity 10000
```
It asks for a password and a few name fields. **Save the passwords** — if you lose this keystore or
its passwords, you can never update the app on Play again. Move the `.keystore` file somewhere safe
**outside** the repo.

### 7b. Tell Gradle about it

Add these lines to **`android/gradle.properties`** (use your real path/passwords; do **not** commit this):
```
TALLY_UPLOAD_STORE_FILE=/absolute/path/to/tally-upload.keystore
TALLY_UPLOAD_STORE_PASSWORD=your-store-password
TALLY_UPLOAD_KEY_ALIAS=tally-upload
TALLY_UPLOAD_KEY_PASSWORD=your-key-password
```
(See `android/keystore.properties.example` for the same notes.)

### 7c. Build the bundle

```bash
npm run bundle:android
```
Output:
```
android/app/build/outputs/bundle/release/app-release.aab
```
Upload that `.aab` in the Google Play Console. (If the keystore properties are missing, the build
still works but signs with the debug key — fine for testing, **not** accepted by Play.)

---

## 8. Troubleshooting (common errors → fixes)

| Error you see | Fix |
|---|---|
| `SDK location not found` / `ANDROID_HOME` | Do step 1e and/or create `android/local.properties` (step 4). Reopen the terminal. |
| `Unsupported class file major version` / Gradle + Java errors | You're not on **JDK 17**. Check `java -version`; install Temurin 17 and make it the default. |
| `Failed to install the following SDK components` / licenses | Run `sdkmanager --licenses` and accept all (step 1f). |
| `NDK not configured` / `No version of NDK matched` | Install **NDK `27.1.12297006`** in SDK Manager (step 1d). |
| `CMake ... not found` | Install **CMake** in SDK Manager → SDK Tools. |
| Build fails compiling a native library (new-architecture issue) | Open `android/gradle.properties`, set `newArchEnabled=false`, then `cd android && ./gradlew clean` and rebuild. |
| `Could not connect to development server` when opening the app | That's a **debug** build needing Metro. Use the **release** APK from step 5 instead (it's standalone). |
| Out-of-memory during Gradle build | In `android/gradle.properties` raise `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`. |
| Stuck / weird cached error | `cd android && ./gradlew clean && cd ..` then rebuild. On Windows use `.\gradlew.bat clean`. |
| `adb: command not found` | Add `platform-tools` to PATH (step 1e) and reopen the terminal. |
| npm install fails on peer deps | Make sure you used `npm install --legacy-peer-deps`. |
| `Failed to install the following SDK components: build-tools;35.0.0` | A dependency pins Build-Tools 35. Install it: `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "build-tools;35.0.0" "platforms;android-35"` (answer `y` to licenses). |
| Codegen error mentioning `react-native-screens` | Version mismatch with React Native. Keep `react-native-screens` pinned **exactly** (`4.16.0`) — no `^`. Newer versions break RN 0.81's codegen; older ones fail the C++ compile. |
| **App installs but closes ~2s after opening** | Read the real cause from the device: see "Reading a crash log" below. Ours was op-sqlite failing under the New Architecture — fixed by `newArchEnabled=false` in `android/gradle.properties`. |

### Reading a crash log (when the app opens then closes)

With the phone connected and USB debugging on:

```bash
adb logcat -c                                     # clear old logs
adb shell am force-stop com.tally.app             # ensure a clean start
adb shell am start -n com.tally.app/.MainActivity # launch it
# let it crash, then:
adb logcat -d > /tmp/crash.log
grep -A 40 "FATAL EXCEPTION" /tmp/crash.log       # the actual error + stack
grep "ReactNativeJS" /tmp/crash.log               # JavaScript-side errors
```
The line right after `FATAL EXCEPTION` names the real cause — always start there instead of guessing.

---

## 9. Quick command reference

```bash
# one-time
git clone <REPO_URL> tally-app && cd tally-app
git checkout rn-cli-migration          # if not merged to main yet
npm install --legacy-peer-deps

# build an installable APK (standalone)
cd android && ./gradlew assembleRelease && cd ..
#  -> android/app/build/outputs/apk/release/app-release.apk

# install to a connected phone
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Play Store bundle (after keystore setup in section 7)
npm run bundle:android
#  -> android/app/build/outputs/bundle/release/app-release.aab

# sanity checks (no device needed)
npm run typecheck                       # TypeScript: expect 0 errors
```

That's it — a fresh machine to an installed app.
