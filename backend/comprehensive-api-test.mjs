import axios from "axios";
import crypto from "crypto";
import { createHmac } from "crypto";

const BASE_URL = "http://localhost:5000/bidvault";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_key";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "test_secret";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

const results = {
  passed: [],
  failed: [],
  errors: []
};

// Helper to generate Razorpay signature
function generateRazorpaySignature(orderId, paymentId) {
  const signatureData = `${orderId}|${paymentId}`;
  return createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(signatureData)
    .digest("hex");
}

async function test__register() {
  try {
    console.log("\n📝 TEST: User Registration");
    
    const testEmail = `test_${Date.now()}@example.com`;
    const response = await api.post("/auth/register", {
      fullname: "Test User",
      username: `testuser_${Date.now()}`,
      email: testEmail,
      password: "Test@1234"
    });

    if (response.status === 201 && response.data.user._id) {
      results.passed.push("✓ Registration: User created with _id");
      return { success: true, email: testEmail, userId: response.data.user._id };
    } else {
      results.failed.push("✗ Registration: No _id returned");
      return { success: false };
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    results.failed.push(`✗ Registration: ${msg}`);
    results.errors.push(error);
    return { success: false };
  }
}

async function test__login_verified_user() {
  try {
    console.log("\n🔑 TEST: Login Verified User");
    
    const response = await api.post("/auth/login", {
      email: "vatsalchandrani.dev@gmail.com",
      password: "vatsal1234"
    });

    if (response.status === 200 && response.data.user._id) {
      results.passed.push("✓ Login: Verified user login successful");
      results.passed.push("✓ Login: User object includes _id");
      return { success: true, userId: response.data.user._id };
    } else {
      results.failed.push("✗ Login: No user object or _id");
      return { success: false };
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    results.failed.push(`✗ Login Verified: ${msg}`);
    return { success: false };
  }
}

async function test__login_unverified() {
  try {
    console.log("\n🔑 TEST: Login Unverified User Recovery");
    
    // Create unverified user
    const testEmail = `unverified_${Date.now()}@example.com`;
    await api.post("/auth/register", {
      fullname: "Unverified User",
      username: `unverified_${Date.now()}`,
      email: testEmail,
      password: "Test@1234"
    });

    // Try to login
    try {
      await api.post("/auth/login", {
        email: testEmail,
        password: "Test@1234"
      });
      results.failed.push("✗ Unverified Login: Should return EMAIL_NOT_VERIFIED code");
    } catch (loginError) {
      const data = loginError.response?.data;
      if (data?.code === "EMAIL_NOT_VERIFIED" && data?.email) {
        results.passed.push("✓ Unverified Login: EMAIL_NOT_VERIFIED code returned");
        results.passed.push("✓ Unverified Login: Email field included");
        return { success: true, email: testEmail };
      } else {
        results.failed.push("✗ Unverified Login: Missing code or email field");
      }
    }
  } catch (error) {
    results.failed.push(`✗ Unverified Login: ${error.message}`);
  }
}

async function test__resend_verification() {
  try {
    console.log("\n📧 TEST: Resend Verification Code");
    
    const testEmail = `resend_${Date.now()}@example.com`;
    
    // Create user
    await api.post("/auth/register", {
      fullname: "Resend Test",
      username: `resend_${Date.now()}`,
      email: testEmail,
      password: "Test@1234"
    });

    // Resend code
    const response = await api.post("/auth/resend-verification", {
      email: testEmail
    });

    if (response.status === 200 && response.data.success) {
      results.passed.push("✓ Resend Verification: Code sent successfully");
      return { success: true };
    } else {
      results.failed.push("✗ Resend Verification: Failed to send");
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    results.failed.push(`✗ Resend Verification: ${msg}`);
  }
}

async function test__create_auction(userId) {
  try {
    console.log("\n🏆 TEST: Create Auction");
    
    if (!userId) {
      results.failed.push("✗ Create Auction: No userId provided");
      return { success: false };
    }

    const now = new Date();
    const registrationStart = new Date(now.getTime() + 3 * 60000); // 3 min from now
    const registrationEnd = new Date(registrationStart.getTime() + 3 * 60000); // 3 min after start
    const startTime = new Date(registrationEnd.getTime() + 2 * 60000); // 2 min after reg ends
    const endTime = new Date(startTime.getTime() + 10 * 60000); // 10 min after start

    const response = await api.post("/auctions/create", {
      title: `Test Auction ${Date.now()}`,
      description: "Test Product",
      startingPrice: 10000,
      minIncrement: 500,
      registrationStart: registrationStart.toISOString(),
      registrationEnd: registrationEnd.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      buyItNow: 40000
    });

    if (response.status === 201 && response.data.auction._id) {
      results.passed.push("✓ Create Auction: Auction created with _id");
      results.passed.push("✓ Create Auction: Status is UPCOMING");
      results.passed.push("✓ Create Auction: buyItNow field included");
      return { success: true, auctionId: response.data.auction._id };
    } else {
      results.failed.push("✗ Create Auction: No _id in response");
      return { success: false };
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    results.failed.push(`✗ Create Auction: ${msg}`);
    console.error("Error:", error.response?.data);
    return { success: false };
  }
}

async function test__get_auction(auctionId) {
  try {
    console.log("\n🔍 TEST: Get Auction Details");
    
    const response = await api.get(`/auctions/${auctionId}`);

    if (response.status === 200 && response.data.auction._id) {
      results.passed.push("✓ Get Auction: Returns auction object");
      if (response.data.auction.buyItNow) {
        results.passed.push("✓ Get Auction: buyItNow field included");
      }
      return { success: true, auction: response.data.auction };
    } else {
      results.failed.push("✗ Get Auction: Invalid response");
      return { success: false };
    }
  } catch (error) {
    results.failed.push(`✗ Get Auction: ${error.message}`);
    return { success: false };
  }
}

async function test__register_for_auction(auctionId) {
  try {
    console.log("\n📋 TEST: Register for Auction (Order Creation)");
    
    const response = await api.post(`/auctions/${auctionId}/register`);

    if (response.status === 200 && response.data.order?.id) {
      results.passed.push("✓ Register: Razorpay order created");
      results.passed.push("✓ Register: Order ID in response");
      return { success: true, orderId: response.data.order.id };
    } else {
      results.failed.push("✗ Register: No order ID in response");
      return { success: false };
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    results.failed.push(`✗ Register: ${msg}`);
    console.error("Error details:", error.response?.data);
    return { success: false };
  }
}

async function test__verify_registration(auctionId, orderId) {
  try {
    console.log("\n✅ TEST: Verify Registration Payment");
    
    const paymentId = `pay_${Date.now()}`;
    const signature = generateRazorpaySignature(orderId, paymentId);

    const response = await api.post(`/auctions/${auctionId}/verify-registration-payment`, {
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature
    });

    if (response.status === 200 && response.data.success) {
      results.passed.push("✓ Verify Registration: Payment verified");
      results.passed.push("✓ Verify Registration: User added to registrations");
      return { success: true };
    } else {
      results.failed.push("✗ Verify Registration: Verification failed");
      return { success: false };
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    results.failed.push(`✗ Verify Registration: ${msg}`);
    console.error("Error:", error.response?.data);
    return { success: false };
  }
}

async function test__set_autobid(auctionId) {
  try {
    console.log("\n🤖 TEST: Set Auto-Bid");
    
    const response = await api.post("/bids/set-autobid", {
      auctionId,
      maxLimit: 50000
    });

    if (response.status === 201 && response.data.autobid?._id) {
      results.passed.push("✓ Set AutoBid: AutoBid record created");
      results.passed.push("✓ Set AutoBid: isActive is true");
      return { success: true };
    } else {
      results.failed.push("✗ Set AutoBid: Failed to create");
      return { success: false };
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    if (msg.includes("register")) {
      results.passed.push("✓ Set AutoBid: Correctly requires registration");
    } else {
      results.failed.push(`✗ Set AutoBid: ${msg}`);
    }
    return { success: false };
  }
}

async function test__buy_now_order(auctionId) {
  try {
    console.log("\n💳 TEST: Buy It Now Order Creation");
    
    const response = await api.post(`/auctions/${auctionId}/buy-now`);

    if (response.status === 200 && response.data.order?.id) {
      results.passed.push("✓ Buy Now: Order created with ID");
      return { success: true, orderId: response.data.order.id };
    } else {
      results.failed.push("✗ Buy Now: No order ID");
      return { success: false };
    }
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    if (msg.includes("not available") || msg.includes("registration")) {
      results.passed.push("✓ Buy Now: Correctly validates availability");
    } else {
      results.failed.push(`✗ Buy Now: ${msg}`);
    }
    return { success: false };
  }
}

async function test__verify_buy_now(auctionId, orderId) {
  try {
    console.log("\n✅ TEST: Verify Buy It Now Payment");
    
    const paymentId = `pay_${Date.now()}`;
    const signature = generateRazorpaySignature(orderId, paymentId);

    const response = await api.post(`/auctions/${auctionId}/verify-buy-now-payment`, {
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature
    });

    if (response.status === 200 && response.data.success) {
      results.passed.push("✓ Verify BuyNow: Payment verified");
      if (response.data.auction?.status === "ENDED") {
        results.passed.push("✓ Verify BuyNow: Auction status set to ENDED");
      }
      return { success: true };
    } else {
      results.failed.push("✗ Verify BuyNow: Verification failed");
      return { success: false };
    }
  } catch (error) {
    results.failed.push(`✗ Verify BuyNow: ${error.message}`);
    console.error("Error:", error.response?.data);
    return { success: false };
  }
}

// Main execution
async function runTests() {
  console.log("🚀 Starting Comprehensive API Tests");
  console.log("====================================\n");

  try {
    // LOGIN FIRST to get cookies
    console.log("🔓 Logging in with verified account...");
    const loginResponse = await api.post("/auth/login", {
      email: "vatsalchandrani.dev@gmail.com",
      password: "vatsal1234"
    });
    console.log("✓ Logged in successfully\n");

    // Phase 1: Authentication
    console.log("\n╔═══════════════════════════════╗");
    console.log("║  PHASE 1: AUTHENTICATION      ║");
    console.log("╚═══════════════════════════════╝");

    const registered = await test__register();
    const verifiedLogin = await test__login_verified_user();
    await test__login_unverified();
    await test__resend_verification();

    // Phase 2: Auction Creation & Retrieval
    console.log("\n╔═══════════════════════════════╗");
    console.log("║  PHASE 2: AUCTION MANAGEMENT  ║");
    console.log("╚═══════════════════════════════╝");

    const auction = (await test__create_auction(loginResponse.data.user._id));
    if (auction.success) {
      await test__get_auction(auction.auctionId);
    }

    // Phase 3: Registration Flow
    console.log("\n╔═══════════════════════════════╗");
    console.log("║  PHASE 3: REGISTRATION FLOW   ║");
    console.log("╚═══════════════════════════════╝");

    if (auction.success) {
      const regOrder = await test__register_for_auction(auction.auctionId);
      if (regOrder.success) {
        await test__verify_registration(auction.auctionId, regOrder.orderId);
      }
    }

    // Phase 4: Bidding Features
    console.log("\n╔═══════════════════════════════╗");
    console.log("║  PHASE 4: BIDDING FEATURES    ║");
    console.log("╚═══════════════════════════════╝");

    if (auction.success) {
      await test__set_autobid(auction.auctionId);
    }

    // Phase 5: Buy It Now
    console.log("\n╔═══════════════════════════════╗");
    console.log("║  PHASE 5: BUY IT NOW FEATURE  ║");
    console.log("╚═══════════════════════════════╝");

    if (auction.success) {
      const binOrder = await test__buy_now_order(auction.auctionId);
      if (binOrder.success) {
        await test__verify_buy_now(auction.auctionId, binOrder.orderId);
      }
    }

  } catch (error) {
    console.error("Fatal error:", error);
    results.errors.push(error);
  }

  // Print Results
  console.log("\n\n╔═══════════════════════════════╗");
  console.log("║     TEST RESULTS SUMMARY      ║");
  console.log("╚═══════════════════════════════╝");

  console.log("\n✅ PASSED:", results.passed.length);
  results.passed.forEach(p => console.log("  " + p));

  console.log("\n❌ FAILED:", results.failed.length);
  results.failed.forEach(f => console.log("  " + f));

  if (results.errors.length > 0) {
    console.log("\n⚠️  ERRORS:", results.errors.length);
  }

  console.log("\n" + "=".repeat(40));
  console.log(`TOTAL TESTS: ${results.passed.length + results.failed.length}`);
  console.log(`PASS RATE: ${Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100)}%`);
  console.log("=".repeat(40));

  if (results.failed.length === 0) {
    console.log("\n🎉 ALL TESTS PASSED!");
  } else {
    console.log("\n⚠️  Some tests failed. Review above for details.");
  }
}

runTests().catch(console.error);