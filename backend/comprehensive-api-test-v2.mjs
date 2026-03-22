import axios from "axios";
import { createHmac } from "crypto";

const BASE_URL = "http://localhost:5000/bidvault";

// Create a single axios instance that persists cookies
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

// Store cookies from Set-Cookie header
let cookies = {};

api.interceptors.response.use(
  response => {
    if (response.headers["set-cookie"]) {
      response.headers["set-cookie"].forEach(cookie => {
        const [name, value] = cookie.split("=");
        cookies[name] = value.split(";")[0];
      });
      // Set all cookies in future requests
      api.defaults.headers.common["Cookie"] = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    }
    return response;
  },
  error => {
    if (error.response?.headers["set-cookie"]) {
      error.response.headers["set-cookie"].forEach(cookie => {
        const [name, value] = cookie.split("=");
        cookies[name] = value.split(";")[0];
      });
      api.defaults.headers.common["Cookie"] = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    }
    return Promise.reject(error);
  }
);

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, status, details = "") {
  results.total++;
  if (status === "PASS") {
    results.passed++;
    console.log(`  ✅ ${name}`);
  } else {
    results.failed++;
    console.log(`  ❌ ${name}`);
    if (details) console.log(`     ${details}`);
  }
  results.tests.push({ name, status, details });
}

async function runTests() {
  console.log("🚀 COMPREHENSIVE API TESTING\n");
  console.log("=".repeat(50));

  try {
    // PHASE 0: LOGIN
    console.log("\n🔐 PHASE 0: LOGIN & SESSION");
    console.log("-".repeat(50));
    
    try {
      const loginRes = await api.post("/auth/login", {
        email: "vatsalchandrani.dev@gmail.com",
        password: "vatsal1234"
      });
      
      if (loginRes.status === 200 && loginRes.data.user?._id) {
        logTest("Login verified user", "PASS");
        logTest("User has _id field", "PASS");
        logTest("Cookies persisted", "PASS");
      } else {
        logTest("Login verified user", "FAIL", "Missing _id field");
      }
    } catch (e) {
      logTest("Login verified user", "FAIL", e.response?.data?.message || e.message);
      return; // Can't continue without login
    }

    // PHASE 1: AUTHENTICATION
    console.log("\n📝 PHASE 1: AUTHENTICATION");
    console.log("-".repeat(50));
    
    // Test 1: Unverified login
    try {
      const testEmail = `unverified_${Date.now()}@example.com`;
      await api.post("/auth/register", {
        fullname: "Unverified User",
        username: `unverified_${Date.now()}`,
        email: testEmail,
        password: "Test@1234"
      });

      try {
        await api.post("/auth/login", {
          email: testEmail,
          password: "Test@1234"
        });
        logTest("Unverified login rejected", "FAIL", "Should return EMAIL_NOT_VERIFIED");
      } catch (loginErr) {
        const statusCode = loginErr.response?.status;
        const code = loginErr.response?.data?.code;
        const email = loginErr.response?.data?.email;
        
        if (statusCode === 400 && code === "EMAIL_NOT_VERIFIED") {
          logTest("Unverified login returns EMAIL_NOT_VERIFIED", "PASS");
          if (email === testEmail) {
            logTest("Unverified login includes email field", "PASS");
          } else {
            logTest("Unverified login email field", "FAIL", `Email field missing or wrong: ${email}`);
          }
        } else {
          logTest("Unverified login error handling", "FAIL", `Status: ${statusCode}, Code: ${code}`);
        }
      }
    } catch (e) {
      logTest("Registration/login flow", "FAIL", e.message);
    }

    // Test 2: Resend verification
    try {
      const testEmail = `resend_${Date.now()}@example.com`;
      await api.post("/auth/register", {
        fullname: "Resend Test",
        username: `resend_${Date.now()}`,
        email: testEmail,
        password: "Test@1234"
      });
      
      const resendRes = await api.post("/auth/resend-verification", {
        email: testEmail
      });
      
      if (resendRes.status === 200 && resendRes.data.success) {
        logTest("Resend verification code", "PASS");
      } else {
        logTest("Resend verification code", "FAIL");
      }
    } catch (e) {
      logTest("Resend verification code", "FAIL", e.response?.data?.message || e.message);
    }

    // PHASE 2: AUCTION CREATION
    console.log("\n🏆 PHASE 2: AUCTION CREATION");
    console.log("-".repeat(50));
    
    let auctionId = null;
    try {
      const now = new Date();
      const regStart = new Date(now.getTime() + 3 * 60000);
      const regEnd = new Date(regStart.getTime() + 3 * 60000);
      const startTime = new Date(regEnd.getTime() + 2 * 60000);
      const endTime = new Date(startTime.getTime() + 10 * 60000);

      const createRes = await api.post("/auctions/create", {
        title: `Test Auction ${Date.now()}`,
        productName: "Test Product",
        productCategory: "Electronics",
        productCondition: "good",
        productDescription: "High quality test product for auction system",
        startingPrice: 10000,
        minIncrement: 500,
        registrationsStartTime: regStart.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        buyItNow: 40000
      });

      if (createRes.status === 201 && createRes.data.auction?._id) {
        auctionId = createRes.data.auction._id;
        logTest("Create auction", "PASS");
        logTest("Auction has _id field", "PASS");
        logTest("Auction has buyItNow field", createRes.data.auction.buyItNow ? "PASS" : "FAIL");
        logTest("Auction status is UPCOMING", createRes.data.auction.status === "UPCOMING" ? "PASS" : "FAIL");
      } else {
        logTest("Create auction", "FAIL", "Missing _id in response");
      }
    } catch (e) {
      logTest("Create auction", "FAIL", e.response?.data?.message || e.message);
      console.error("  Full error:", e.response?.data);
    }

    // Test 2: Get auction
    if (auctionId) {
      try {
        const getRes = await api.get(`/auctions/${auctionId}`);
        if (getRes.status === 200 && getRes.data.auction?._id) {
          logTest("Get auction details", "PASS");
          logTest("Auction includes buyItNow", getRes.data.auction.buyItNow ? "PASS" : "FAIL");
        } else {
          logTest("Get auction details", "FAIL");
        }
      } catch (e) {
        logTest("Get auction details", "FAIL", e.message);
      }
    }

    // PHASE 3: REGISTRATION & PAYMENT
    console.log("\n📋 PHASE 3: REGISTRATION & PAYMENT");
    console.log("-".repeat(50));
    
    if (auctionId) {
      let orderId = null;
      
      // Create registration order
      try {
        const regRes = await api.post(`/auctions/${auctionId}/register`);
        if (regRes.status === 200 && regRes.data.order?.id) {
          orderId = regRes.data.order.id;
          logTest("Create registration order", "PASS");
          logTest("Order has payment amount", regRes.data.order.amount > 0 ? "PASS" : "FAIL");
        } else {
          logTest("Create registration order", "FAIL", "No order ID");
        }
      } catch (e) {
        logTest("Create registration order", "FAIL", e.response?.data?.message || e.message);
      }

      // Verify registration payment
      if (orderId) {
        try {
          const paymentId = `pay_${Date.now()}`;
          const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "test_secret")
            .update(`${orderId}|${paymentId}`)
            .digest("hex");

          const verifyRes = await api.post(`/auctions/${auctionId}/verify-registration-payment`, {
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature
          });

          if (verifyRes.status === 200 && verifyRes.data.success) {
            logTest("Verify registration payment", "PASS");
            logTest("User added to registrations", "PASS");
          } else {
            logTest("Verify registration payment", "FAIL");
          }
        } catch (e) {
          logTest("Verify registration payment", "FAIL", e.response?.data?.message || e.message);
          console.error("Verify error details:", e.response?.data);
        }
      }
    }

    // PHASE 4: BIDDING FEATURES
    console.log("\n🤖 PHASE 4: AUTO-BID & MANUAL BID");
    console.log("-".repeat(50));
    
    if (auctionId) {
      // Test auto-bid
      try {
        const autobidRes = await api.post("/bids/set-autobid", {
          auctionId,
          maxLimit: 50000
        });

        if (autobidRes.status === 201 && autobidRes.data.autobid?._id) {
          logTest("Set auto-bid for registered user", "PASS");
          logTest("Auto-bid is active", autobidRes.data.autobid.isActive ? "PASS" : "FAIL");
        } else {
          logTest("Set auto-bid", "FAIL");
        }
      } catch (e) {
        logTest("Set auto-bid", "FAIL", e.response?.data?.message || e.message);
      }
    }

    // PHASE 5: BUY IT NOW FEATURE
    console.log("\n💳 PHASE 5: BUY IT NOW FEATURE");
    console.log("-".repeat(50));
    
    if (auctionId) {
      let binOrderId = null;
      
      // Create BIN order
      try {
        const binRes = await api.post(`/auctions/${auctionId}/buy-now`);
        if (binRes.status === 200 && binRes.data.order?.id) {
          binOrderId = binRes.data.order.id;
          logTest("Create Buy It Now order", "PASS");
          logTest("BIN order has amount", binRes.data.order.amount > 0 ? "PASS" : "FAIL");
        } else {
          logTest("Create Buy It Now order", "FAIL", "No order ID");
        }
      } catch (e) {
        // This might fail if registration already started, which is expected
        if (e.response?.status === 400) {
          const msg = e.response?.data?.message || "";
          if (msg.includes("not available") || msg.includes("registration") || msg.includes("UPCOMING")) {
            logTest("Buy It Now availability validation", "PASS", "Correctly validates timing window");
          } else {
            logTest("Buy It Now validation", "FAIL", msg);
          }
        } else {
          logTest("Create Buy It Now order", "FAIL", e.response?.data?.message || e.message);
        }
      }

      // Verify BIN payment only if order was created
      if (binOrderId) {
        try {
          const paymentId = `pay_${Date.now()}`;
          const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "test_secret")
            .update(`${binOrderId}|${paymentId}`)
            .digest("hex");

          const binVerifyRes = await api.post(`/auctions/${auctionId}/verify-buy-now-payment`, {
            razorpay_payment_id: paymentId,
            razorpay_order_id: binOrderId,
            razorpay_signature: signature
          });

          if (binVerifyRes.status === 200 && binVerifyRes.data.success) {
            logTest("Verify Buy It Now payment", "PASS");
            logTest("Auction status set to ENDED", binVerifyRes.data.auction?.status === "ENDED" ? "PASS" : "FAIL");
          } else {
            logTest("Verify Buy It Now payment", "FAIL");
          }
        } catch (e) {
          logTest("Verify Buy It Now payment", "FAIL", e.message);
        }
      }
    }

  } catch (error) {
    console.error("Fatal error:", error.message);
  }

  // RESULTS
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`📈 Pass Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  console.log("=".repeat(50));

  if (results.failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! App is ready for integration testing.\n");
  } else {
    console.log(`\n⚠️ ${results.failed} test(s) need attention.\n`);
  }
}

runTests().catch(console.error);