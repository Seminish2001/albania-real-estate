import express from 'express';
import Stripe from 'stripe';
import { authenticate, authorize } from '../middleware/auth.js';
import { Agent } from '../models/Agent.js';

const router = express.Router();

let stripeClient;
const getStripe = () => {
  if (stripeClient) {
    return stripeClient;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key is not configured');
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
  });
  return stripeClient;
};

// Agent subscription payment
router.post('/create-subscription', authenticate, authorize('agent'), async (req, res) => {
  try {
    const { paymentMethodId, priceId } = req.body;

    if (!paymentMethodId || !priceId) {
      return res.status(400).json({
        success: false,
        error: 'Payment method and price ID are required'
      });
    }

    const stripe = getStripe();

    // Create Stripe customer
    const customer = await stripe.customers.create({
      payment_method: paymentMethodId,
      email: req.user.email,
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent']
    });

    // Update agent to premium
    await Agent.upgradeToPremium(req.user.id, subscription.id);

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      }
    });
  } catch (error) {
    console.error('Subscription error:', error);
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Unable to process subscription at this time'
        : error.message;
    res.status(400).json({
      success: false,
      error: message
    });
  }
});

export default router;
