import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/payment.model.js';

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env.');
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

/**
 * Create a Razorpay order for registration fees
 */
export const createRegistrationOrder = async (auctionId, amount, userId) => {
  try {
    const razorpay = getRazorpayClient();
    const shortAuctionId = String(auctionId).slice(-8);
    const shortTs = Date.now().toString().slice(-10);
    const orderData = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise (1 rupee = 100 paise)
      currency: 'INR',
      receipt: `reg_${shortAuctionId}_${shortTs}`,
      notes: {
        auctionId: auctionId.toString(),
        userId: userId.toString(),
        purpose: 'registration_fee',
      },
    };

    const order = await razorpay.orders.create(orderData);
    
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    const details = error?.error?.description || error?.description || error?.message || 'Unknown Razorpay error';
    throw new Error(`Failed to create payment order: ${details}`);
  }
};

/**
 * Create a Razorpay order for winning payment
 */
export const createWinningPaymentOrder = async (auctionId, amount, userId) => {
  try {
    const razorpay = getRazorpayClient();
    const shortAuctionId = String(auctionId).slice(-8);
    const shortTs = Date.now().toString().slice(-10);
    const orderData = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `win_${shortAuctionId}_${shortTs}`,
      notes: {
        auctionId: auctionId.toString(),
        userId: userId.toString(),
        purpose: 'winning_payment',
      },
    };

    const order = await razorpay.orders.create(orderData);

    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    const details = error?.error?.description || error?.description || error?.message || 'Unknown Razorpay error';
    throw new Error(`Failed to create payment order: ${details}`);
  }
};

/**
 * Verify payment signature from Razorpay
 * Returns true if signature is valid, false otherwise
 */
export const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 */
export const getPaymentDetails = async (paymentId) => {
  try {
    const razorpay = getRazorpayClient();
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Razorpay fetch payment error:', error);
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
};

/**
 * Update payment record in database
 */
export const updatePaymentRecord = async (paymentId, status, razorpayPaymentId) => {
  try {
    const normalizedStatus = String(status).toUpperCase() === "SUCCESS"
      ? "PAID"
      : String(status).toUpperCase();

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: normalizedStatus,
        metadata: {
          razorpayPaymentId,
          verifiedAt: new Date(),
        },
      },
      { new: true }
    );
    return payment;
  } catch (error) {
    console.error('Error updating payment record:', error);
    throw new Error(`Failed to update payment record: ${error.message}`);
  }
};

export default {
  createRegistrationOrder,
  createWinningPaymentOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  updatePaymentRecord,
};