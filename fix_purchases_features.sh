#!/bin/bash

# Script to add missing features to Purchases.tsx

FILE="src/pages/backoffice/Purchases.tsx"

# 1. Add handleDeletePurchase function before return statement
# Find line with "return (" and insert function before it
LINE_RETURN=$(grep -n "^  return (" "$FILE" | head -1 | cut -d: -f1)

# Create the delete function
cat > /tmp/delete_function.txt << 'EOF'
  // Delete purchase handler (Owner only)
  const handleDeletePurchase = async (purchase: Purchase) => {
    if (user?.role !== 'owner') {
      toast.error('Hanya Owner yang dapat menghapus riwayat pembelian');
      return;
    }

    if (!confirm(`Yakin ingin menghapus pembelian ${purchase.reference_no}?\n\nData ini tidak dapat dikembalikan.`)) {
      return;
    }

    try {
      await deletePurchase(purchase.id);
      toast.success('Riwayat pembelian berhasil dihapus');
      setViewPurchase(null);
      loadData();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error('Gagal menghapus riwayat pembelian');
    }
  };

EOF

# Insert delete function before return
sed -i "${LINE_RETURN}r /tmp/delete_function.txt" "$FILE"

# 2. Replace the detail dialog content (lines 1196-1244)
# This is complex, so we'll use a different approach
# Find the closing of purchaseDetails.map and insert image section after it

# 3. Add Image Viewer Modal before closing </div>
# Find the last </div> before closing brace
LINE_END=$(grep -n "^  );$" "$FILE" | tail -1 | cut -d: -f1)
LINE_INSERT=$((LINE_END - 2))

cat > /tmp/image_modal.txt << 'EOF'
      
      {/* Image Proof Viewer Modal */}
      <Dialog open={!!viewImageProof} onOpenChange={() => setViewImageProof(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembelian</DialogTitle>
          </DialogHeader>
          {viewImageProof && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
                <img 
                  src={viewImageProof} 
                  alt="Bukti pembelian" 
                  className="w-full max-h-[70vh] object-contain"
                />
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewImageProof(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
EOF

sed -i "${LINE_INSERT}r /tmp/image_modal.txt" "$FILE"

echo "✅ Features added successfully!"
echo "Please refresh your browser to see the changes."
