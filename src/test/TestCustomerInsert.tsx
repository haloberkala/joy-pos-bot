import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Test component to debug customer insert
 * Add this to a page temporarily to test
 */
export function TestCustomerInsert() {
  const { activeStoreId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testDirectInsert = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('=== TEST CUSTOMER INSERT ===');
      console.log('Active Store ID:', activeStoreId);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      
      // Test 0: Check if store exists
      console.log('\n0. Checking if store exists...');
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', activeStoreId)
        .single();
      
      console.log('Store check:', { data: storeData, error: storeError });
      
      if (storeError || !storeData) {
        console.error('❌ Store does not exist!');
        toast.error(`Store ID ${activeStoreId} tidak ditemukan di database!`);
        setResult({ step: 'STORE_CHECK', error: 'Store not found', activeStoreId });
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Store exists:', storeData.name);
      
      // Test 1: Check if we can read from customers table
      console.log('\n1. Testing SELECT...');
      const { data: selectData, error: selectError } = await supabase
        .from('customers')
        .select('*')
        .limit(5);
      
      console.log('SELECT result:', { data: selectData, error: selectError });
      
      if (selectError) {
        console.error('SELECT error:', selectError);
        toast.error(`SELECT failed: ${selectError.message}`);
        setResult({ step: 'SELECT', error: selectError });
        setIsLoading(false);
        return;
      }
      
      // Test 2: Try to insert
      console.log('\n2. Testing INSERT...');
      const testCustomer = {
        store_id: activeStoreId,
        name: 'Test Customer ' + Date.now(),
        phone: '0812-TEST-' + Date.now(),
        address: 'Test Address',
        email: 'test@example.com',
      };
      
      console.log('Inserting:', testCustomer);
      
      const { data: insertData, error: insertError } = await supabase
        .from('customers')
        .insert(testCustomer)
        .select()
        .single();
      
      console.log('INSERT result:', { data: insertData, error: insertError });
      
      if (insertError) {
        console.error('INSERT error:', insertError);
        console.error('Error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        toast.error(`INSERT failed: ${insertError.message}`);
        setResult({ step: 'INSERT', error: insertError, testData: testCustomer });
        setIsLoading(false);
        return;
      }
      
      console.log('✅ INSERT successful!');
      toast.success('Test insert berhasil!');
      setResult({ step: 'SUCCESS', data: insertData });
      
      // Test 3: Verify the insert
      console.log('\n3. Verifying INSERT...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', insertData.id)
        .single();
      
      console.log('VERIFY result:', { data: verifyData, error: verifyError });
      
      // Clean up
      console.log('\n4. Cleaning up test data...');
      await supabase
        .from('customers')
        .delete()
        .eq('id', insertData.id);
      
      console.log('=== TEST COMPLETE ===');
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Unexpected error: ' + (error as Error).message);
      setResult({ step: 'EXCEPTION', error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border space-y-4">
      <h2 className="text-lg font-bold">Test Customer Insert</h2>
      <p className="text-sm text-muted-foreground">
        Active Store ID: <strong>{activeStoreId}</strong>
      </p>
      <p className="text-sm text-muted-foreground">
        This will test direct insert to customers table and show detailed logs in console.
      </p>
      
      <Button onClick={testDirectInsert} disabled={isLoading}>
        {isLoading ? 'Testing...' : 'Run Test'}
      </Button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded text-xs">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">
        <p>Open browser console (F12) to see detailed logs</p>
      </div>
    </div>
  );
}
