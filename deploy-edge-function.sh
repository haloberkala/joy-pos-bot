#!/bin/bash

# 🚀 Deploy Edge Function Script
# This script helps you deploy the update-employee-password Edge Function

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🚀 Deploy Edge Function: update-employee-password        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Installing Supabase CLI..."
    npm install -g supabase
    echo "✅ Supabase CLI installed!"
    echo ""
fi

# Check Supabase version
echo "📦 Supabase CLI version:"
supabase --version
echo ""

# Check if already logged in
echo "🔐 Checking authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo ""
    echo "Opening browser for login..."
    supabase login
    echo "✅ Logged in successfully!"
    echo ""
else
    echo "✅ Already logged in"
    echo ""
fi

# List available projects
echo "📋 Your Supabase projects:"
supabase projects list
echo ""

# Ask for project reference
echo "📝 Enter your Project Reference (from URL or list above):"
read -p "Project Ref: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference is required!"
    exit 1
fi

# Link project
echo ""
echo "🔗 Linking to project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"
echo "✅ Project linked!"
echo ""

# Deploy Edge Function
echo "🚀 Deploying Edge Function: update-employee-password"
supabase functions deploy update-employee-password
echo ""
echo "✅ Edge Function deployed successfully!"
echo ""

# Show deployed functions
echo "📋 Deployed functions:"
supabase functions list
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEPLOYMENT COMPLETE!                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Open your application"
echo "2. Login as Owner/Admin"
echo "3. Go to 'Manajemen Karyawan'"
echo "4. Edit an employee and update password"
echo "5. Test login with new password"
echo ""
echo "View logs:"
echo "  supabase functions logs update-employee-password"
echo ""
echo "Happy coding! 🎉"
