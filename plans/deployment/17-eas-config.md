# 17 - EAS Build & Submit Configuration

## Overview

Configure Expo Application Services (EAS) for building and submitting the lookyswappy app to iOS App Store and Google Play Store.

---

## Prerequisites

1. **Expo Account**: Create at [expo.dev](https://expo.dev)
2. **Apple Developer Account**: $99/year at [developer.apple.com](https://developer.apple.com)
3. **Google Play Console**: $25 one-time at [play.google.com/console](https://play.google.com/console)

---

## Initial Setup

```bash
cd lookyswappy-app

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS in project
eas build:configure
```

This creates `eas.json` in your project root.

---

## eas.json Configuration

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:8000"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-staging.yourdomain.com"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.yourdomain.com"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

## app.json Configuration

```json
{
  "expo": {
    "name": "lookyswappy Scorer",
    "slug": "lookyswappy-scorer",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "lookyswappy",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.lookyswappyscorer",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Not used - no camera access needed"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"
      },
      "package": "com.yourname.lookyswappyscorer",
      "versionCode": 1
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id-from-expo-dev"
      }
    },
    "owner": "your-expo-username",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    }
  }
}
```

---

## Apple Developer Setup

### 1. Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Click "+" to register new identifier
3. Select "App IDs" → "App"
4. Enter:
   - Description: lookyswappy Scorer
   - Bundle ID: `com.yourname.lookyswappyscorer` (explicit)
5. Enable capabilities as needed (none special for this app)

### 2. Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/apps)
2. Click "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: lookyswappy Scorer
   - Primary Language: English
   - Bundle ID: Select from dropdown
   - SKU: `lookyswappy-scorer-001`
4. Note the Apple ID (number) for eas.json `ascAppId`

### 3. Get Team ID

1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Click "Membership" in sidebar
3. Copy "Team ID" for eas.json `appleTeamId`

---

## Google Play Setup

### 1. Create App

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - App name: lookyswappy Scorer
   - Default language: English
   - App or game: App
   - Free or paid: Free
4. Accept policies and create

### 2. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Go to "IAM & Admin" → "Service Accounts"
4. Create service account:
   - Name: `play-store-deploy`
   - Role: None (we'll set permissions in Play Console)
5. Create JSON key and download

### 3. Link Service Account to Play Console

1. In Play Console, go to "Setup" → "API access"
2. Link to your Google Cloud project
3. Under "Service accounts", find your account
4. Click "Manage Play Console permissions"
5. Add permissions:
   - Release apps to testing tracks
   - Manage store presence

### 4. Store Key Securely

```bash
# Add to .gitignore
echo "google-service-account.json" >> .gitignore

# For CI, store as base64 in GitHub secret
cat google-service-account.json | base64
# Copy output to GOOGLE_SERVICE_ACCOUNT_KEY secret
```

---

## Build Profiles Explained

| Profile | Use Case | Distribution |
|---------|----------|--------------|
| `development` | Local testing with dev client | Internal (TestFlight/Firebase) |
| `preview` | QA testing, stakeholder demos | Internal |
| `production` | App store release | Public |

---

## Build Commands

```bash
# Development build (includes dev tools)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (production-like, internal distribution)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Check build status
eas build:list

# Download build
eas build:view --latest
```

---

## Submit Commands

```bash
# Submit latest iOS build to App Store
eas submit --platform ios --latest

# Submit latest Android build to Play Store
eas submit --platform android --latest

# Submit specific build
eas submit --platform ios --id <build-id>
```

---

## App Store Assets Required

### iOS

| Asset | Size | Notes |
|-------|------|-------|
| App Icon | 1024x1024 | No transparency |
| Screenshots (6.7") | 1290x2796 | iPhone 15 Pro Max |
| Screenshots (6.5") | 1284x2778 | iPhone 14 Plus |
| Screenshots (5.5") | 1242x2208 | iPhone 8 Plus |
| iPad Screenshots | 2048x2732 | If supporting tablet |

### Android

| Asset | Size | Notes |
|-------|------|-------|
| App Icon | 512x512 | PNG, no transparency |
| Feature Graphic | 1024x500 | Displayed in Play Store |
| Screenshots | Various | Min 2, max 8 per device type |

---

## Version Management

### Bumping Versions

```bash
# Update version in app.json
# "version": "1.0.0" → "1.1.0"

# iOS: increment buildNumber
# "buildNumber": "1" → "2"

# Android: increment versionCode
# "versionCode": 1 → 2

# Or use eas-cli
eas build:version:set --platform ios --build-number 2
eas build:version:set --platform android --version-code 2
```

### Semantic Versioning

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features
- **Patch** (1.0.0 → 1.0.1): Bug fixes

---

## OTA Updates

EAS Update allows pushing JS/asset changes without app store review:

```bash
# Publish update to production channel
eas update --branch production --message "Fix scoring bug"

# Publish to preview channel
eas update --branch preview --message "New feature testing"
```

Updates are automatic - app checks on launch.

---

## Tasks

- [ ] Create Expo account and project
- [ ] Install and configure EAS CLI
- [ ] Create eas.json with all profiles
- [ ] Set up Apple Developer account
- [ ] Create App ID and App Store Connect entry
- [ ] Set up Google Play Console app
- [ ] Create and configure Google service account
- [ ] Create app icons and splash screen
- [ ] Test development build locally
- [ ] Test preview build internally
- [ ] Prepare app store listings and screenshots
- [ ] Submit first production build
- [ ] Configure OTA updates
