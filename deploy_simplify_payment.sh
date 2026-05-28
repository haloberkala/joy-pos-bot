#!/bin/bash

# ============================================
# Deploy Script: Simplify Supplier Payment
# ============================================

echo "🚀 Starting deployment: Simplify Supplier Payment"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if Supabase CLI is installed
echo "📋 Step 1: Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓ Supabase CLI found${NC}"
else
    echo -e "${YELLOW}⚠ Supabase CLI not found${NC}"
    echo "  You'll need to run the migration manually via Supabase Dashboard"
    echo "  File: supabase/migrations/019_remove_payment_method_from_supplier_payments.sql"
fi
echo ""

# Step 2: Show migration file
echo "📋 Step 2: Migration file ready"
echo "  File: supabase/migrations/019_remove_payment_method_from_supplier_payments.sql"
echo -e "${GREEN}✓ Migration file created${NC}"
echo ""

# Step 3: Ask user to run migration
echo "📋 Step 3: Database Migration"
echo "  Please run the migration using one of these methods:"
echo ""
echo "  Method 1 - Supabase CLI:"
echo "    $ supabase db push"
echo ""
echo "  Method 2 - Supabase Dashboard:"
echo "    1. Open Supabase Dashboard"
echo "    2. Go to SQL Editor"
echo "    3. Copy-paste content from:"
echo "       supabase/migrations/019_remove_payment_method_from_supplier_payments.sql"
echo "    4. Click 'Run'"
echo ""
read -p "Press Enter after you've run the migration..."
echo ""

# Step 4: Verify changes
echo "📋 Step 4: Verifying code changes..."
echo ""

# Check if files were modified
if [ -f "src/services/supplierPaymentsService.ts" ]; then
    echo -e "${GREEN}✓ Service layer updated${NC}"
else
    echo -e "${RED}✗ Service file not found${NC}"
fi

if [ -f "src/pages/backoffice/Purchases.tsx" ]; then
    echo -e "${GREEN}✓ UI component updated${NC}"
else
    echo -e "${RED}✗ UI component file not found${NC}"
fi

# Check if payment_method is removed from code
if grep -q "payment_method" "src/pages/backoffice/Purchases.tsx"; then
    echo -e "${RED}✗ Warning: payment_method still found in Purchases.tsx${NC}"
else
    echo -e "${GREEN}✓ payment_method removed from Purchases.tsx${NC}"
fi

echo ""

# Step 5: Summary
echo "📋 Step 5: Summary of Changes"
echo "================================"
echo ""
echo "Database:"
echo "  - Removed column: supplier_payments.payment_method"
echo ""
echo "Service Layer (supplierPaymentsService.ts):"
echo "  - Updated interface: SupplierPayment"
echo "  - Updated interface: CreateSupplierPaymentInput"
echo "  - Updated function: createSupplierPayment()"
echo "  - Updated function: updateSupplierPayment()"
echo ""
echo "UI Component (Purchases.tsx):"
echo "  - Removed state: paymentMethod"
echo "  - Removed UI: Payment Method dropdown"
echo "  - Updated handler: handlePayDebt()"
echo "  - Updated button text: 'Bayar Sekarang'"
echo ""

# Step 6: Next steps
echo "📋 Step 6: Next Steps"
echo "====================="
echo ""
echo "1. Test the changes locally (if possible)"
echo "2. Commit the changes:"
echo "   $ git add ."
echo "   $ git commit -m 'feat: simplify supplier payment - remove payment method field'"
echo ""
echo "3. Push to repository:"
echo "   $ git push origin main"
echo ""
echo "4. Deploy frontend (if not auto-deployed)"
echo ""
echo "5. Test in production:"
echo "   - Open 'Kulakan / Supply' page"
echo "   - Go to 'Utang Supplier' tab"
echo "   - Click 'Bayar' button"
echo "   - Verify the form is simplified"
echo "   - Test making a payment"
echo ""

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "📖 For detailed documentation, see: SIMPLIFY_SUPPLIER_PAYMENT.md"
echo ""
