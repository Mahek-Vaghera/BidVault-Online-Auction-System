import 'dotenv/config';
import axios from 'axios';
import crypto from 'crypto';

const API_BASE_URL = 'http://localhost:5000/bidvault';

const sellerCreds = { email: 'vatsalchandrani.dev@gmail.com', password: 'vatsal1234' };
const buyerCreds = { email: 'vatsalchandrani.code@gmail.com', password: 'vatsal1234' };

function makeClient() {
  const client = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    validateStatus: () => true,
  });

  let authCookie = '';

  client.interceptors.request.use((config) => {
    if (authCookie) {
      config.headers.Cookie = authCookie;
    }
    return config;
  });

  client.interceptors.response.use((response) => {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader?.length) {
      authCookie = setCookieHeader[0].split(';')[0];
    }
    return response;
  });

  return client;
}

function sign(orderId, paymentId) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

async function login(client, creds) {
  const resp = await client.post('/auth/login', creds);
  if (resp.status !== 200 || !resp.data?.success) {
    throw new Error(`Login failed for ${creds.email}: ${resp.data?.message || resp.status}`);
  }
  return resp.data.user;
}

async function run() {
  const seller = makeClient();
  const buyer = makeClient();
  const admin = axios.create({ baseURL: API_BASE_URL, validateStatus: () => true });

  const result = {
    sellerLogin: false,
    buyerLogin: false,
    buyerAddressUpdated: false,
    auctionCreatedUnverified: false,
    buyerBlockedBeforeVerify: false,
    adminLogin: false,
    adminOverview: false,
    adminPendingAuctions: false,
    adminVerifiedAuction: false,
    buyerCanOpenAfterVerify: false,
    saveAuctionToggle: false,
    buyNowOrderCreated: false,
    buyNowVerified: false,
    deliveryCreated: false,
    adminDeliveryUpdate: false,
    buyerDeliveryUpdatedVisible: false,
  };

  console.log('\n=== FULL SYSTEM TEST START ===');

  await login(seller, sellerCreds);
  result.sellerLogin = true;

  await login(buyer, buyerCreds);
  result.buyerLogin = true;

  const addressRes = await buyer.put('/auth/address', {
    line1: '123 Test Street',
    line2: 'Near Circle',
    city: 'Rajkot',
    state: 'Gujarat',
    pincode: '360001',
    country: 'India',
    phone: '9876543210',
  });
  result.buyerAddressUpdated = addressRes.status === 200 && addressRes.data?.success;

  const now = new Date();
  const addMinutes = (mins) => new Date(now.getTime() + mins * 60000).toISOString();

  const createRes = await seller.post('/auctions/create', {
    title: `FULL-SYSTEM-${Date.now()}`,
    productName: 'System Test Product',
    productCategory: 'Electronics',
    productCondition: 'good',
    productDescription: 'System test for verification, save, and delivery',
    startingPrice: 10000,
    minIncrement: 500,
    registrationsStartTime: addMinutes(5),
    startTime: addMinutes(10),
    endTime: addMinutes(20),
    buyItNow: 15000,
  });

  if (createRes.status !== 201 || !createRes.data?.success) {
    console.log('Auction creation failed:', createRes.status, createRes.data?.message);
    throw new Error('Auction creation failed');
  }

  const auctionId = createRes.data.auction._id;
  result.auctionCreatedUnverified = createRes.data.auction.isVerified === false;

  const buyerBeforeVerify = await buyer.get(`/auctions/${auctionId}`);
  result.buyerBlockedBeforeVerify = buyerBeforeVerify.status === 403;

  const adminLoginRes = await admin.post('/admin/login', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  if (adminLoginRes.status !== 200 || !adminLoginRes.data?.token) {
    console.log('Admin login failed:', adminLoginRes.status, adminLoginRes.data?.message);
    throw new Error('Admin login failed');
  }

  const adminToken = adminLoginRes.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  result.adminLogin = true;

  const adminOverviewRes = await admin.get('/admin/overview', { headers: adminHeaders });
  result.adminOverview = adminOverviewRes.status === 200 && adminOverviewRes.data?.success;

  const pendingRes = await admin.get('/admin/auctions/pending', { headers: adminHeaders });
  result.adminPendingAuctions = pendingRes.status === 200 && pendingRes.data?.success;

  const verifyRes = await admin.post(`/admin/auctions/${auctionId}/verify`, { verified: true }, { headers: adminHeaders });
  result.adminVerifiedAuction = verifyRes.status === 200 && verifyRes.data?.success;

  const buyerAfterVerify = await buyer.get(`/auctions/${auctionId}`);
  result.buyerCanOpenAfterVerify = buyerAfterVerify.status === 200 && buyerAfterVerify.data?.success;

  const saveOnRes = await buyer.post(`/auctions/${auctionId}/save`);
  const saveOffRes = await buyer.post(`/auctions/${auctionId}/save`);
  result.saveAuctionToggle = saveOnRes.status === 200 && saveOffRes.status === 200;

  const buyNowRes = await buyer.post(`/auctions/${auctionId}/buy-now`);
  if (buyNowRes.status === 200 && buyNowRes.data?.success) {
    result.buyNowOrderCreated = true;

    const orderId = buyNowRes.data.paymentOrder.orderId;
    const paymentId = buyNowRes.data.paymentId;
    const fakePaymentId = `pay_full_${Date.now()}`;
    const signature = sign(orderId, fakePaymentId);

    const verifyBuyRes = await buyer.post(`/auctions/${auctionId}/verify-buy-now-payment`, {
      razorpayOrderId: orderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: signature,
      paymentId,
    });

    result.buyNowVerified = verifyBuyRes.status === 200 && verifyBuyRes.data?.success;
    result.deliveryCreated = Boolean(verifyBuyRes.data?.delivery?._id);
  } else {
    console.log('Buy-now creation failed:', buyNowRes.status, buyNowRes.data?.message);
  }

  const buyerDeliveryRes = await buyer.get(`/auctions/${auctionId}/delivery`);
  const deliveryId = buyerDeliveryRes.data?.delivery?._id;

  if (buyerDeliveryRes.status === 200 && deliveryId) {
    const update1 = await admin.patch(`/admin/deliveries/${deliveryId}/status`, {
      status: 'ADMIN_APPROVED',
      note: 'Approved by admin in full system test',
    }, { headers: adminHeaders });

    const update2 = await admin.patch(`/admin/deliveries/${deliveryId}/status`, {
      status: 'OUT_FOR_DELIVERY',
      note: 'Out for delivery in full system test',
    }, { headers: adminHeaders });

    result.adminDeliveryUpdate = update1.status === 200 && update2.status === 200;

    const buyerDeliveryUpdatedRes = await buyer.get(`/auctions/${auctionId}/delivery`);
    result.buyerDeliveryUpdatedVisible =
      buyerDeliveryUpdatedRes.status === 200 &&
      buyerDeliveryUpdatedRes.data?.delivery?.status === 'OUT_FOR_DELIVERY';
  }

  console.log('\n=== FULL SYSTEM RESULT ===');
  console.log(JSON.stringify(result, null, 2));

  const checks = Object.values(result);
  if (checks.every(Boolean)) {
    console.log('\nFULL SYSTEM PASS');
    process.exit(0);
  }

  console.log('\nFULL SYSTEM PARTIAL/FAIL');
  process.exit(1);
}

run().catch((err) => {
  console.error('FULL SYSTEM fatal error:', err.message);
  process.exit(1);
});