# 01 - Expo Project Setup

## Overview

Set up the React Native + Expo project with TypeScript, file-based routing, and all required dependencies.

---

## Dependencies

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-paper": "^5.12.0",
    "react-native-safe-area-context": "^4.12.0",
    "@nozbe/watermelondb": "^0.27.0",
    "@nozbe/with-observables": "^1.6.0",
    "expo-secure-store": "~14.0.0",
    "@react-native-community/netinfo": "^11.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "~5.3.0",
    "openapi-typescript": "^7.0.0"
  }
}
```

---

## Project Structure

```
lookyswappy-app/
├── app/                      # Expo Router pages
│   ├── (tabs)/
│   │   ├── index.tsx         # Home/Active Games
│   │   ├── history.tsx       # Past games
│   │   └── stats.tsx         # Statistics
│   ├── game/
│   │   ├── [id]/
│   │   │   ├── index.tsx     # Scoreboard
│   │   │   └── add-round.tsx # Enter round scores
│   │   └── new.tsx           # Create game
│   └── _layout.tsx
├── components/
│   ├── game/
│   │   ├── PlayerList.tsx
│   │   ├── ScoreInput.tsx
│   │   ├── ScoreTable.tsx
│   │   └── BonusIndicator.tsx
│   └── ui/
├── database/
│   ├── index.ts              # DB initialization
│   ├── schema.ts             # WatermelonDB schema
│   └── models/               # Model classes
├── services/
│   ├── scoring.ts            # Bonus calculation logic
│   └── sync.ts               # Sync implementation
├── hooks/
│   ├── useGame.ts
│   └── useScoring.ts
├── types/
│   └── api.d.ts              # Generated from OpenAPI
├── app.json
├── tsconfig.json
└── package.json
```

---

## Setup Commands

```bash
# Create new Expo project
npx create-expo-app@latest lookyswappy-app --template tabs

# Navigate to project
cd lookyswappy-app

# Install core dependencies
npx expo install react-native-paper react-native-safe-area-context
npx expo install expo-secure-store
npx expo install @react-native-community/netinfo

# Install WatermelonDB (requires some native config)
npm install @nozbe/watermelondb @nozbe/with-observables

# Install dev dependencies
npm install -D openapi-typescript
```

---

## Configuration Files

### app.json

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
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.lookyswappyscorer"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourname.lookyswappyscorer"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

### tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

---

## NPM Scripts

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "generate:api-types": "openapi-typescript http://localhost:8000/openapi.json -o ./types/api.d.ts"
  }
}
```

---

## WatermelonDB Setup Note

WatermelonDB requires native modules. For Expo managed workflow, you'll need to use a development build:

```bash
# Create development build
npx expo install expo-dev-client
npx expo prebuild
eas build --profile development --platform all
```

See `02-database-schema.md` for WatermelonDB schema details.

---

## Tasks

- [ ] Run `create-expo-app` with tabs template
- [ ] Install all dependencies
- [ ] Configure app.json with correct bundle IDs
- [ ] Set up path aliases in tsconfig
- [ ] Create folder structure
- [ ] Set up development build for WatermelonDB
- [ ] Verify app runs on simulator/device
