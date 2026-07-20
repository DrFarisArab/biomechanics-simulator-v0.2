# Android Release

The Android project is generated with Capacitor and uses the static Next.js bundle in `out/`.

## Everyday build

```bash
npm run cap:sync
npm run android:bundle
```

`cap:sync` rebuilds the web app and copies the latest static files into the Android project before Gradle runs.

## First release signing setup

1. Install Android Studio and Android SDK Platform 36. Android Studio installs the matching JDK.
2. Create and safely back up a release keystore:

```bash
keytool -genkeypair -v -keystore android/physiomotion-release.keystore -alias physiomotion -keyalg RSA -keysize 4096 -validity 10000
```

3. Copy `android/keystore.properties.example` to `android/keystore.properties`, then add the passwords and alias used for the keystore.
4. Run `npm run android:bundle`.

The signed App Bundle is written to `android/app/build/outputs/bundle/release/app-release.aab`.

## Icon and splash sources

`assets/icon-only.png` and `assets/splash.png` are the source placeholders. After replacing either image, regenerate Android resources with:

```bash
npx capacitor-assets generate --android
```

Android 12 and newer use the app icon with a colored background for the splash screen.
