# Xcode Cloud Setup for Expo Prebuild Project

This document explains how to set up Xcode Cloud for automated builds and TestFlight distribution for our Expo project with Apple Health integration.

## Overview

Our project uses Expo with Apple Health integration, which requires native iOS code. We use Expo prebuild to generate the native iOS project, and Xcode Cloud to build and distribute the app.

## Files Structure

```
ios/
├── ci_scripts/
│   └── ci_post_clone.sh          # Xcode Cloud setup script
├── ChatHealth.xcworkspace          # Main workspace file
├── ChatHealth.xcodeproj/           # Xcode project
├── ChatHealth/                     # App source files
├── Podfile                        # CocoaPods dependencies
└── build/                         # Build artifacts (ignored)
```

## CI Post-Clone Script

The `ios/ci_scripts/ci_post_clone.sh` script runs after Xcode Cloud clones the repository and:

1. **Installs Node.js** (v20.11.0) using n (Node Version Manager)
2. **Installs dependencies** via `npm install`
3. **Installs Expo CLI** globally if not available
4. **Runs Expo prebuild** to ensure iOS project is up to date
5. **Installs CocoaPods** dependencies
6. **Verifies** that the workspace file exists

## Git Configuration

The `.gitignore` is configured to:
- **Include** essential iOS project files for Xcode Cloud
- **Exclude** build artifacts, user data, and generated files
- **Include** the `ci_scripts/` directory

### Included iOS Files:
- `ios/ci_scripts/` - CI scripts for Xcode Cloud
- `ios/*.xcworkspace/` - Workspace file
- `ios/*.xcodeproj/` - Project file
- `ios/ChatHealth/` - App source files
- `ios/Podfile` - CocoaPods configuration

### Excluded iOS Files:
- `ios/build/` - Build artifacts
- `ios/Pods/` - CocoaPods dependencies (regenerated)
- `ios/Podfile.lock` - Lock file (regenerated)
- `ios/*.xcworkspace/xcuserdata/` - User-specific data
- `ios/*.xcodeproj/xcuserdata/` - User-specific data

## Xcode Cloud Workflow Setup

1. **Open Xcode** and navigate to the ios directory
2. **Open** `ChatHealth.xcworkspace` in Xcode
3. **Navigate** to Report Navigator → Cloud tab
4. **Create Workflow** and review suggested settings
5. **Grant access** to your source code repository
6. **Configure environment variables** if needed:
   - Node.js version: 20.11.0
   - Xcode version: 16.4+
   - Any API keys or secrets required

## Environment Variables

If your app requires environment variables, add them in Xcode Cloud:
- Go to your workflow settings
- Add environment variables under "Environment"
- These will be available during the build process

## Troubleshooting

### Common Issues:

1. **Workspace not found**: Ensure iOS files are committed to git
2. **Dependencies fail**: Check Node.js and npm versions in CI script
3. **Prebuild fails**: Verify Expo configuration in `app.json`
4. **CocoaPods issues**: Check iOS deployment target compatibility

### Debugging:

1. **Check CI logs** in Xcode Cloud for detailed error messages
2. **Verify locally** by running `npx expo prebuild --clean`
3. **Test dependencies** with `cd ios && pod install`

## Updating the iOS Project

When making changes that affect the native iOS project:

1. **Run locally**: `npx expo prebuild --clean`
2. **Test the build**: Open workspace in Xcode and build
3. **Commit changes**: Include any updated iOS project files
4. **Push to main**: Trigger Xcode Cloud build

## Apple Health Integration

Our app requires Apple Health integration, which needs:
- Native iOS code (via Expo prebuild)
- Proper entitlements in `ios/ChatHealth/ChatHealth.entitlements`
- HealthKit capability enabled in Xcode project
- Privacy usage descriptions in `ios/ChatHealth/Info.plist`

This is why we can't use standard Expo builds and need Xcode Cloud with native iOS files.
