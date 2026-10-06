#!/bin/bash

# Xcode Cloud CI Post-Clone Script for Expo Prebuild Project
# Hybrid approach: Bun for speed + Node.js for Expo compatibility

set -e  # Exit on any error

echo "🚀 Hybrid Xcode Cloud CI Script (Bun + Node.js)"
echo "📱 Directory: $(pwd)"

# Install Bun (fastest for dependencies)
echo "⚡ Installing Bun..."
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
echo "⚡ Bun installed: $(bun --version)"

# Install Node.js for Expo prebuild compatibility
echo "📱 Installing Node.js for Expo compatibility..."
curl -L https://bit.ly/n-install | bash -s -- -y 20.11.0
export PATH="$HOME/n/bin:$PATH"
echo "📱 Node.js installed: $(node --version)"
echo "📱 npm available: $(npm --version)"

# Move to project root and install dependencies with Bun (faster)
cd /Volumes/workspace/repository
echo "⚡ Installing dependencies with Bun..."
bun install

# Install Expo CLI via npm (for better compatibility)
echo "📱 Installing Expo CLI via npm..."
npm install -g @expo/cli

# Backup CI scripts before prebuild (--clean deletes everything!)
echo "🛡️ Backing up CI scripts..."
cp -r ios/ci_scripts /tmp/ci_scripts_backup

# Run expo prebuild (now npm is available in PATH)
echo "📱 Running expo prebuild..."
npx expo prebuild --platform ios --clean

# Restore CI scripts after prebuild
echo "🛡️ Restoring CI scripts..."
mkdir -p ios/ci_scripts
cp -r /tmp/ci_scripts_backup/* ios/ci_scripts/
rm -rf /tmp/ci_scripts_backup

# Install CocoaPods dependencies (this will regenerate the workspace)
echo "📱 Installing CocoaPods..."
cd ios
pod install --repo-update
cd ..

# Verify workspace was created
echo "📱 Verifying workspace..."
if [ -f "ios/ChatHealth.xcworkspace/contents.xcworkspacedata" ]; then
    echo "✅ Workspace found at ios/ChatHealth.xcworkspace/"
    echo "✅ Xcode Cloud should be configured to use:"
    echo "   - Workspace: ChatHealth.xcworkspace"
    echo "   - Scheme: ChatHealth"
else
    echo "❌ ChatHealth workspace not found - this will cause build failure"
    echo "Looking for workspace files..."
    find ios/ -name "*.xcworkspace" -type d
    ls -la ios/
    exit 1
fi

echo "✅ Setup complete!"
