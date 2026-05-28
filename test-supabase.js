// Test Supabase Connection
// Run: node test-supabase.js

const SUPABASE_URL = 'https://mxncvpwbeelnsazcjjlp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmN2cHdiZWVsbnNhemNqamxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTYwNjAsImV4cCI6MjA5MzczMjA2MH0.ZhW6JgSJka2TVl6P3_K2PE3VlgWv7HNIe2NF0TVunMw';

async function testSupabase() {
  console.log('🔍 Testing Supabase Connection...\n');
  
  // Test 1: Check if URL is reachable
  console.log('1️⃣ Testing URL:', SUPABASE_URL);
  try {
    const response = await fetch(SUPABASE_URL);
    console.log('   ✅ URL reachable, status:', response.status);
  } catch (error) {
    console.log('   ❌ URL not reachable:', error.message);
    return;
  }
  
  // Test 2: Test Auth - Sign In (skip sign up, user sudah dibuat via dashboard)
  console.log('\n2️⃣ Testing Auth - Sign In');
  const testEmail = 'owner@demo.com';
  const testPassword = 'owner123';
  try {
    const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      })
    });
    
    const signInData = await signInResponse.json();
    
    if (signInResponse.ok) {
      console.log('   ✅ Sign in successful!');
      console.log('   Access token:', signInData.access_token?.substring(0, 20) + '...');
    } else {
      console.log('   ❌ Sign in failed:', signInData);
    }
  } catch (error) {
    console.log('   ❌ Sign in error:', error.message);
  }
  
  console.log('\n✨ Test completed!\n');
}

testSupabase();
