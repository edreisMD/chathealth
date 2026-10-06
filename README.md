# ChatHealth

An open-source React Native / Expo mobile app for health conversations, check-ins, Apple Health integration, lab image attachments, voice messages, and reminders.

## What is included

This repository contains the mobile client, not the backend. Authentication requires your own Supabase project. Chat, transcription, uploads, health sync, and server notifications require a compatible backend implementing the routes used in `src/lib/routes.ts` and `src/lib/api.ts`. No production credentials or hosted service access are provided.

## Get started

Use Node.js 20 or later, Bun, and Xcode for iOS development.

```sh
git clone https://github.com/edreisMD/chathealth.git
cd chathealth
bun install --frozen-lockfile
cp .env.example .env
```

Edit `.env` with your own backend URL and Supabase URL and publishable/anon key. For development, the backend defaults to port 3000 on the Metro host; set `EXPO_PUBLIC_LOCALHOST_IP` when using a tunnel or a different machine. For production, set `EXPO_PUBLIC_API_ENV=production` and an HTTPS `EXPO_PUBLIC_API_BASE_URL`.

```sh
bunx expo run:ios
# After installing the native development client:
bun run start
```

HealthKit and native authentication require a native development build; Expo Go is insufficient. The iOS project can be regenerated with `bunx expo prebuild --platform ios --clean`. Keep the legacy architecture enabled (`newArchEnabled: false`) for the current HealthKit integration.

## Configure your deployment

`app.config.js` reads optional build settings from `.env`:

- `IOS_BUNDLE_IDENTIFIER` and `ANDROID_PACKAGE`: your registered app identifiers. Defaults are examples.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: your Google OAuth clients. The iOS URL scheme is derived automatically. Enable the corresponding provider in Supabase.
- `EXPO_OWNER` and `EAS_PROJECT_ID`: your Expo account and project. Push registration is skipped without a project ID.
- `APP_LINK_DOMAIN`: optional domain for iOS universal links.

Configure Apple Sign In and signing credentials for your own app through Apple Developer and Supabase. EAS submission account settings are intentionally empty; configure them for your own account.

`EXPO_PUBLIC_*` values are bundled into the app and can be read by anyone. Never put service-role keys, signing keys, or backend secrets in them. Supabase authorization and row-level security must be enforced by your backend configuration.

The optional Apple OAuth helper runs locally with `bun --env-file=.env generate-apple-jwt.js`. It requires the `APPLE_*` variables listed in `.env.example` and a private key outside version control. Its output is a secret intended for your auth provider, not application code or CI logs.

## Validation

```sh
bun run typecheck
bun run lint
bunx expo config --type public
```

`test-notifications.js` is an opt-in integration script that creates a check-in on your configured backend. Run it only against your own test environment, with a test session in `TEST_JWT`.

This is a development project, not a validated medical device. Some screens are placeholders. Native builds, authentication, and backend integrations need testing with your own services before deployment.

## License

MIT; see [LICENSE](LICENSE). Third-party dependencies retain their own licenses.
