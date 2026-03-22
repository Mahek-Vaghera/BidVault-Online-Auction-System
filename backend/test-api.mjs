import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/bidvault';
let authCookie = '';
let userId = '';
let auctionId = '';
let paymentId = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  validateStatus: () => true, // Don't throw on any status
});

// Interceptor to attach cookies
api.interceptors.request.use((config) => {
  if (authCookie) {
    config.headers.Cookie = authCookie;
  }
  return config;
});

// Interceptor to capture cookies
api.interceptors.response.use((response) => {
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    authCookie = setCookieHeader[0].split(';')[0];
  }
  return response;
});

async function testLogin() {
  console.log('\n➤ Testing Login...');
  try {
    const response = await api.post('/auth/login', {
      email: 'vatsalchandrani.dev@gmail.com',
      password: 'vatsal1234',
    });

    console.log(`Status: ${response.status}`);
    console.log(`Success: ${response.data.success}`);
    console.log(`Message: ${response.data.message}`);

    if (response.data.success && response.data.user) {
      userId = response.data.user._id;
      console.log(`✓ User ID: ${userId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ Login failed:', error.message);
    return false;
  }
}

async function testGetAuctions() {
  console.log('\n➤ Testing Get Auctions...');
  try {
    const response = await api.get('/auctions');
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${response.data.success}`);
    console.log(`Auctions Count: ${response.data.auctions?.length || 0}`);

    if (response.data.auctions && response.data.auctions.length > 0) {
      auctionId = response.data.auctions[0]._id;
      console.log(`✓ First Auction ID: ${auctionId}`);
      console.log(`  Title: ${response.data.auctions[0].title}`);
      console.log(`  Status: ${response.data.auctions[0].status}`);
      console.log(`  RegistrationsStartTime: ${response.data.auctions[0].registrationsStartTime}`);
      console.log(`  StartTime: ${response.data.auctions[0].startTime}`);
      return true;
    } else {
      console.log('ℹ No auctions available');
      return false;
    }
  } catch (error) {
    console.error('✗ Get auctions failed:', error.message);
    return false;
  }
}

async function testRegisterForAuction() {
  if (!auctionId) {
    console.log('\n⚠ Skipping auction registration test - no auctions available');
    return false;
  }

  console.log('\n➤ Testing Auction Registration...');
  try {
    const response = await api.post(`/auctions/${auctionId}/register`);
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${response.data.success}`);
    console.log(`Message: ${response.data.message}`);

    if (response.data.success) {
      paymentId = response.data.paymentId;
      console.log(`✓ Payment Order Created`);
      console.log(`  Order ID: ${response.data.paymentOrder?.orderId}`);
      console.log(`  Amount: ${response.data.paymentOrder?.amount}`);
      console.log(`  Payment ID: ${paymentId}`);
      return true;
    } else if (response.status === 400 && response.data.message.includes('Registration')) {
      console.log('ℹ Registration not available for this auction (expected)');
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ Registration failed:', error.message);
    return false;
  }
}

async function testPaymentEndpoint() {
  if (!auctionId) {
    console.log('\n⚠ Skipping payment test - no auctions available');
    return false;
  }

  console.log('\n➤ Testing Payment Endpoint (Winning Payment)...');
  try {
    const response = await api.post(`/auctions/${auctionId}/pay`);
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${response.data.success}`);
    console.log(`Message: ${response.data.message}`);

    if (response.status === 400 && response.data.message.includes('not ended')) {
      console.log('ℹ Auction not ended yet (expected)');
      return true;
    }

    return response.data.success || response.status === 400;
  } catch (error) {
    console.error('✗ Payment test failed:', error.message);
    return false;
  }
}

async function testEnpoints() {
  console.log('═══════════════════════════════════════════');
  console.log('BidVault API Test Suite');
  console.log('═══════════════════════════════════════════');

  let passed = 0;
  let total = 4;

  if (await testLogin()) passed++;
  if (await testGetAuctions()) passed++;
  if (await testRegisterForAuction()) passed++;
  if (await testPaymentEndpoint()) passed++;

  console.log('\n═══════════════════════════════════════════');
  console.log(`Test Results: ${passed}/${total} passed`);
  console.log('═══════════════════════════════════════════\n');

  if (passed === total) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

testEnpoints();