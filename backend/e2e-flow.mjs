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

const now = new Date();
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);
const toInput = (d) => new Date(d).toISOString();

const auctionTemplates = [
  {
    key: 'buyNowBeforeReg',
    title: `E2E-BUYNOW-${Date.now()}`,
    registrationsStartTime: toInput(addMinutes(now, 5)),
    startTime: toInput(addMinutes(now, 9)),
    endTime: toInput(addMinutes(now, 14)),
    buyItNow: 15000,
  },
  {
    key: 'registerNow',
    title: `E2E-REG-${Date.now()}`,
    registrationsStartTime: toInput(addMinutes(now, -1)),
    startTime: toInput(addMinutes(now, 4)),
    endTime: toInput(addMinutes(now, 10)),
    buyItNow: 0,
  },
  {
    key: 'autobidNoRegister',
    title: `E2E-AUTO-NOREG-${Date.now()}`,
    registrationsStartTime: toInput(addMinutes(now, -1)),
    startTime: toInput(addMinutes(now, 4)),
    endTime: toInput(addMinutes(now, 10)),
    buyItNow: 0,
  },
  {
    key: 'futureOne',
    title: `E2E-FUTURE-1-${Date.now()}`,
    registrationsStartTime: toInput(addMinutes(now, 4)),
    startTime: toInput(addMinutes(now, 8)),
    endTime: toInput(addMinutes(now, 13)),
    buyItNow: 22000,
  },
  {
    key: 'futureTwo',
    title: `E2E-FUTURE-2-${Date.now()}`,
    registrationsStartTime: toInput(addMinutes(now, 6)),
    startTime: toInput(addMinutes(now, 10)),
    endTime: toInput(addMinutes(now, 16)),
    buyItNow: 28000,
  },
];

function buildAuctionPayload(template, idx) {
  const payload = {
    title: template.title,
    productName: `Product ${idx + 1}`,
    productCategory: 'Electronics',
    productCondition: 'good',
    productDescription: `E2E product ${idx + 1}`,
    startingPrice: 10000 + idx * 1000,
    minIncrement: 500,
    registrationsStartTime: template.registrationsStartTime,
    startTime: template.startTime,
    endTime: template.endTime,
  };

  if (template.buyItNow && template.buyItNow > 0) {
    payload.buyItNow = template.buyItNow;
  }

  return payload;
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

  const result = {
    auctionsCreated: 0,
    registerOrderCreated: false,
    registerVerified: false,
    autobidBlockedWithoutRegistration: false,
    autobidSetAfterRegistration: false,
    saveAuctionToggleChecked: false,
    buyNowOrderCreated: false,
    buyNowVerified: false,
    loginUnverifiedPathChecked: false,
    resendVerificationChecked: false,
  };

  const created = {};

  console.log('\n=== E2E FLOW START ===');

  await login(seller, sellerCreds);
  await login(buyer, buyerCreds);

  // Address is now mandatory before winning/buy-now payment.
  const addressResp = await buyer.put('/auth/address', {
    line1: '123 E2E Street',
    line2: 'Near Test Landmark',
    city: 'Rajkot',
    state: 'Gujarat',
    pincode: '360001',
    country: 'India',
    phone: '9876543210',
  });
  if (addressResp.status !== 200 || !addressResp.data?.success) {
    console.log('Buyer address update failed:', addressResp.status, addressResp.data?.message);
  }

  for (let i = 0; i < auctionTemplates.length; i++) {
    const template = auctionTemplates[i];
    const payload = buildAuctionPayload(template, i);
    const resp = await seller.post('/auctions/create', payload);
    if (resp.status === 201 && resp.data?.success) {
      created[template.key] = resp.data.auction?._id;
      result.auctionsCreated += 1;
      console.log(`Created auction: ${template.key} -> ${created[template.key]}`);
    } else {
      console.log(`Failed to create ${template.key}:`, resp.status, resp.data?.message);
    }
  }

  const regAuctionId = created.registerNow;
  if (regAuctionId) {
    const regResp = await buyer.post(`/auctions/${regAuctionId}/register`);
    if (regResp.status === 200 && regResp.data?.success) {
      result.registerOrderCreated = true;
      const orderId = regResp.data.paymentOrder.orderId;
      const fakePaymentId = `pay_e2e_${Date.now()}`;
      const signature = sign(orderId, fakePaymentId);

      const verifyResp = await buyer.post(`/auctions/${regAuctionId}/verify-registration-payment`, {
        razorpayOrderId: orderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: signature,
        paymentId: regResp.data.paymentId,
        auctionId: regAuctionId,
      });

      if (verifyResp.status === 200 && verifyResp.data?.success) {
        result.registerVerified = true;
      } else {
        console.log('Registration verify failed:', verifyResp.status, verifyResp.data?.message);
      }
    } else {
      console.log('Registration order creation failed:', regResp.status, regResp.data?.message);
    }
  }

  const autoNoRegAuctionId = created.autobidNoRegister;
  if (autoNoRegAuctionId) {
    const noRegAutoResp = await buyer.post(`/auctions/${autoNoRegAuctionId}/autobid`, { maxLimit: 13000 });
    if (noRegAutoResp.status === 403) {
      result.autobidBlockedWithoutRegistration = true;
    } else {
      console.log('Autobid without registration was not blocked:', noRegAutoResp.status, noRegAutoResp.data?.message);
    }
  }

  if (regAuctionId && result.registerVerified) {
    const setAutoResp = await buyer.post(`/auctions/${regAuctionId}/autobid`, { maxLimit: 17000 });
    if (setAutoResp.status === 200 && setAutoResp.data?.success) {
      result.autobidSetAfterRegistration = true;
    } else {
      console.log('Autobid after registration failed:', setAutoResp.status, setAutoResp.data?.message);
    }

    const saveResp1 = await buyer.post(`/auctions/${regAuctionId}/save`);
    const saveResp2 = await buyer.post(`/auctions/${regAuctionId}/save`);
    if ((saveResp1.status === 200 && saveResp2.status === 200) || (saveResp1.status === 400 && saveResp2.status === 400)) {
      result.saveAuctionToggleChecked = true;
    } else {
      console.log('Save toggle failed:', saveResp1.status, saveResp2.status);
    }
  }

  const buyNowAuctionId = created.buyNowBeforeReg;
  if (buyNowAuctionId) {
    const buyNowResp = await buyer.post(`/auctions/${buyNowAuctionId}/buy-now`);
    if (buyNowResp.status === 200 && buyNowResp.data?.success) {
      result.buyNowOrderCreated = true;
      const orderId = buyNowResp.data.paymentOrder.orderId;
      const fakePaymentId = `pay_buy_${Date.now()}`;
      const signature = sign(orderId, fakePaymentId);

      const verifyBuyResp = await buyer.post(`/auctions/${buyNowAuctionId}/verify-buy-now-payment`, {
        razorpayOrderId: orderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: signature,
        paymentId: buyNowResp.data.paymentId,
      });

      if (verifyBuyResp.status === 200 && verifyBuyResp.data?.success) {
        result.buyNowVerified = true;
      } else {
        console.log('Buy-now verify failed:', verifyBuyResp.status, verifyBuyResp.data?.message);
      }
    } else {
      console.log('Buy-now order failed:', buyNowResp.status, buyNowResp.data?.message);
    }
  }

  const unverifiedEmail = `e2e_unverified_${Date.now()}@mailinator.com`;
  const registerUnverified = await buyer.post('/auth/register', {
    username: 'e2e_unverified',
    email: unverifiedEmail,
    password: 'vatsal1234',
  });

  if ((registerUnverified.status === 201 || registerUnverified.status === 200) && registerUnverified.data?.success) {
    const loginUnverified = await buyer.post('/auth/login', {
      email: unverifiedEmail,
      password: 'vatsal1234',
    });

    if (loginUnverified.status === 401 && loginUnverified.data?.code === 'EMAIL_NOT_VERIFIED') {
      result.loginUnverifiedPathChecked = true;
    }

    const resend = await buyer.post('/auth/resend-verification', { email: unverifiedEmail });
    if (resend.status === 200 && resend.data?.success) {
      result.resendVerificationChecked = true;
    }
  }

  console.log('\n=== E2E RESULT ===');
  console.log(JSON.stringify(result, null, 2));

  const checks = [
    result.auctionsCreated >= 4,
    result.registerOrderCreated,
    result.registerVerified,
    result.autobidBlockedWithoutRegistration,
    result.autobidSetAfterRegistration,
    result.saveAuctionToggleChecked,
    result.buyNowOrderCreated,
    result.buyNowVerified,
    result.loginUnverifiedPathChecked,
    result.resendVerificationChecked,
  ];

  if (checks.every(Boolean)) {
    console.log('\nE2E PASS');
    process.exit(0);
  }

  console.log('\nE2E PARTIAL/FAIL');
  process.exit(1);
}

run().catch((err) => {
  console.error('E2E fatal error:', err.message);
  process.exit(1);
});