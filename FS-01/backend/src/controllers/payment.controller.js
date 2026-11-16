import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import MockPayment from '../models/mockPayment.model.js';
import Payout from '../models/payout.model.js';
import { env } from '../config/env.js';
import { getPaymentProvider } from '../services/payment/index.js';
import { markOrderPaid } from '../services/order.service.js';
import { createPayouts } from '../services/payout.service.js';
import { acquireLock, releaseLock, startLockHeartbeat } from '../utils/lock.utils.js';

/**
 * POST /api/payments/create-order
 * Customer only: Initiates payment order on configured provider.
 * Amount is derived exclusively from MongoDB order.total.
 */
export const createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Access control: only customer who placed the order can create payment order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: You do not own this order' });
    }

    // If order is already paid, return idempotent success
    if (order.payment.status === 'paid') {
      return res.status(200).json({
        alreadyPaid: true,
        providerOrderId: order.payment.providerOrderId,
        order,
        message: 'Order has already been paid successfully',
      });
    }

    // Only allow if payment status is pending or failed
    if (order.payment.status !== 'pending' && order.payment.status !== 'failed') {
      return res.status(400).json({
        error: `Cannot initiate payment for order with payment status "${order.payment.status}"`,
      });
    }

    // Re-check inventory for all items in order
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive || product.stock < item.qty) {
        return res.status(409).json({
          error: `Product "${item.title}" is out of stock or no longer available`,
          productId: item.productId,
        });
      }
    }

    const amountPaise = Math.round(order.total * 100);

    // Fast path: If order already has an active provider order session in pending status, reuse it
    if (order.payment.status === 'pending' && order.payment.providerOrderId) {
      return res.status(200).json({
        providerOrderId: order.payment.providerOrderId,
        amount: amountPaise,
        currency: 'INR',
        provider: order.payment.provider || 'mock',
        orderNumber: order.orderNumber,
      });
    }

    // Concurrency guard: Acquire atomic lock for provider order creation (30s TTL with heartbeat renewal)
    const lockResource = `order:${order._id}`;
    let lockToken = await acquireLock(lockResource, 30);

    if (!lockToken) {
      // Another concurrent request is currently creating the provider order.
      // Poll briefly for completion.
      const maxWaitMs = env.nodeEnv === 'test' ? 300 : 5000;
      const pollIntervalMs = env.nodeEnv === 'test' ? 25 : 50;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const latestOrder = await Order.findById(orderId);
        if (latestOrder) {
          if (latestOrder.payment.status === 'paid') {
            return res.status(200).json({
              alreadyPaid: true,
              providerOrderId: latestOrder.payment.providerOrderId,
              order: latestOrder,
              message: 'Order has already been paid successfully',
            });
          }

          if (latestOrder.payment.status === 'pending' && latestOrder.payment.providerOrderId) {
            return res.status(200).json({
              providerOrderId: latestOrder.payment.providerOrderId,
              amount: amountPaise,
              currency: 'INR',
              provider: latestOrder.payment.provider || 'mock',
              orderNumber: latestOrder.orderNumber,
            });
          }
        }

        // Try acquiring lock again if the other request finished or failed
        lockToken = await acquireLock(lockResource, 30);
        if (lockToken) {
          break;
        }
      }

      // If waiting timed out and lock is still held by another request, return retryable response
      if (!lockToken) {
        return res.status(409).json({
          error: 'Payment session initialization is currently in progress. Please retry in a moment.',
          code: 'PAYMENT_INITIALIZATION_IN_PROGRESS',
          retryable: true,
        });
      }
    }

    const heartbeat = startLockHeartbeat(lockResource, lockToken, 30, 10000);

    try {
      // Re-check order state inside lock
      const currentOrder = await Order.findById(orderId);
      if (currentOrder) {
        if (currentOrder.payment.status === 'paid') {
          return res.status(200).json({
            alreadyPaid: true,
            providerOrderId: currentOrder.payment.providerOrderId,
            order: currentOrder,
            message: 'Order has already been paid successfully',
          });
        }

        if (currentOrder.payment.status === 'pending' && currentOrder.payment.providerOrderId) {
          return res.status(200).json({
            providerOrderId: currentOrder.payment.providerOrderId,
            amount: amountPaise,
            currency: 'INR',
            provider: currentOrder.payment.provider || 'mock',
            orderNumber: currentOrder.orderNumber,
          });
        }
      }

      const provider = getPaymentProvider();
      const targetOrder = currentOrder || order;

      const providerOrder = await provider.createOrder({
        orderId: targetOrder._id.toString(),
        amountPaise,
        currency: 'INR',
        notes: {
          orderNumber: targetOrder.orderNumber,
          customerId: req.user._id.toString(),
        },
      });

      // Save providerOrderId on order
      targetOrder.payment.provider = providerOrder.provider;
      targetOrder.payment.providerOrderId = providerOrder.providerOrderId;
      targetOrder.payment.status = 'pending';
      targetOrder.payment.failureReason = '';
      await targetOrder.save();

      return res.status(200).json({
        providerOrderId: providerOrder.providerOrderId,
        amount: amountPaise,
        currency: providerOrder.currency || 'INR',
        provider: providerOrder.provider,
        orderNumber: targetOrder.orderNumber,
      });
    } finally {
      heartbeat.stop();
      if (lockToken) {
        await releaseLock(lockResource, lockToken);
      }
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/verify
 * Customer only: Verifies HMAC signature, captures payment, atomically decrements stock, and triggers payouts.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        error: 'Missing verification parameters: order_id, payment_id, and signature are required',
      });
    }

    const order = await Order.findOne({ 'payment.providerOrderId': order_id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found for provider order ID' });
    }

    // Access control: only owner
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: You do not own this order' });
    }

    const provider = getPaymentProvider(order.payment?.provider || 'mock');
    const verification = await provider.verifyPayment({ order_id, payment_id, signature });

    if (!verification.valid) {
      order.payment.status = 'failed';
      order.payment.failureReason = 'Payment signature verification failed';
      await order.save();

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Invalid signature',
      });
    }

    // Determine payment method from mock payment if recorded
    const mockRecord = await MockPayment.findOne({ id: payment_id });
    const method = mockRecord?.method || 'card';

    // Atomically mark paid & decrement stock (idempotent)
    const { order: paidOrder } = await markOrderPaid(order._id, {
      providerPaymentId: payment_id,
      providerOrderId: order_id,
      method,
      provider: provider.name,
    });

    // Create payouts for each vendor subOrder (idempotent)
    const payouts = await createPayouts(paidOrder._id);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and captured successfully',
      order: paidOrder,
      payouts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/webhook
 * Public endpoint (no JWT). Verifies signature using raw request body.
 * Idempotently processes payment.captured, payment.failed, transfer.processed, transfer.failed.
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-razorpay-signature'];
    const provider = getPaymentProvider();

    const verification = await provider.verifyWebhook(req.body, signature);
    if (!verification.valid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = verification.event;

    if (event === 'payment.captured') {
      const paymentData = payload?.payment;
      if (paymentData?.orderId) {
        const order = await Order.findOne({ 'payment.providerOrderId': paymentData.orderId });
        if (order) {
          if (order.payment.status !== 'paid') {
            await markOrderPaid(order._id, {
              providerPaymentId: paymentData.id,
              providerOrderId: paymentData.orderId,
              method: paymentData.method || 'card',
              provider: provider.name,
            });
            await createPayouts(order._id);
          }
        }
      }
    } else if (event === 'payment.failed') {
      const paymentData = payload?.payment;
      if (paymentData?.orderId) {
        const order = await Order.findOne({ 'payment.providerOrderId': paymentData.orderId });
        if (order && order.payment.status !== 'paid') {
          order.payment.status = 'failed';
          order.payment.failureReason = paymentData.failureReason || 'Payment failed';
          await order.save();
        }
      }
    } else if (event === 'transfer.processed') {
      const transferData = payload?.transfer;
      if (transferData?.id) {
        await Payout.findOneAndUpdate(
          { transferId: transferData.id },
          { status: 'processed', failureReason: '' }
        );
      }
    } else if (event === 'transfer.failed') {
      const transferData = payload?.transfer;
      if (transferData?.id) {
        await Payout.findOneAndUpdate(
          { transferId: transferData.id },
          { status: 'failed', failureReason: transferData.failureReason || 'Transfer failed' }
        );
      }
    }

    // Always respond 200 to acknowledge webhook delivery
    return res.status(200).json({ status: 'ok', handled: true });
  } catch (err) {
    next(err);
  }
};
