#!/bin/bash

# MFA Dependencies Installation Script
# This script installs all required dependencies for the MFA system

echo "🔐 Installing MFA dependencies for Loom app..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Install MFA-related packages
echo "📦 Installing core MFA packages..."
npm install speakeasy qrcode crypto-js

echo "📦 Installing TypeScript definitions..."
npm install --save-dev @types/speakeasy @types/qrcode @types/crypto-js

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ MFA dependencies installed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Add MFA_ENCRYPTION_KEY to your .env.local file"
    echo "2. Run the database migration: supabase migration up --local"
    echo "3. Update the MFA service imports (see MFA_IMPLEMENTATION_GUIDE.md)"
    echo "4. Test the MFA setup flow"
    echo ""
    echo "📚 For detailed setup instructions, see: MFA_IMPLEMENTATION_GUIDE.md"
else
    echo "❌ Error: Failed to install MFA dependencies. Please check the error messages above."
    exit 1
fi

# Display installed versions
echo "📋 Installed package versions:"
npm list speakeasy qrcode crypto-js @types/speakeasy @types/qrcode @types/crypto-js --depth=0 2>/dev/null | grep -E "(speakeasy|qrcode|crypto-js)"

echo ""
echo "🔒 Security reminder:"
echo "Remember to generate a secure 32-character encryption key for MFA_ENCRYPTION_KEY!"
echo "Example: $(openssl rand -base64 32)"