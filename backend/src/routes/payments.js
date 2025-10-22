import express from 'express';
import Stripe from 'stripe';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { Agent } from '../models/Agent.js';

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const isStripeConfigured = Boolean(stripeSecretKey);
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let stripe = null;

if (isStripeConfigured) {
  stripe = new Stripe(stripeSecretKey);
} else {
  console.warn(
    '⚠️ Stripe environment variables are not configured. Payment features are disabled until STRIPE_SECRET_KEY is set.'
  );
}

// Subscription plans
const SUBSCRIPTION_PLANS = {
  premium_monthly: {
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    name: 'Premium Monthly',
    price: 29.99,
    currency: 'eur',
    interval: 'month'
  },
  premium_yearly: {
    priceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    name: 'Premium Yearly',
    price: 299.99,
    currency: 'eur',
    interval: 'year'
  }
};

const ensureStripeAvailable = (res) => {
  if (!stripe) {
    return res.status(503).json({
      success: false,
      error: 'Payment service is currently unavailable. Please try again later.'
    });
  }
  return true;
};

Object.entries(SUBSCRIPTION_PLANS).forEach(([planKey, plan]) => {
  if (!plan.priceId) {
    console.warn(`⚠️ Stripe price ID is not configured for plan: ${planKey}`);
  }
});

// Create subscription
router.post('/create-subscription',
  authenticate,
  authorize('agent'),
  [
    body('paymentMethodId').notEmpty(),
    body('planId').isIn(['premium_monthly', 'premium_yearly'])
  ],
  async (req, res) => {
    try {
      if (!ensureStripeAvailable(res)) return;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { paymentMethodId, planId } = req.body;
      const plan = SUBSCRIPTION_PLANS[planId];

      if (!plan || !plan.priceId) {
        return res.status(400).json({
          success: false,
          error: 'Selected plan is not available at the moment'
        });
      }

      // Get or create Stripe customer
      let customer;
      const existingCustomer = await stripe.customers.list({
        email: req.user.email,
        limit: 1
      });

      if (existingCustomer.data.length > 0) {
        customer = existingCustomer.data[0];
        
        // Attach payment method to existing customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });

        // Set as default payment method
        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.name,
          payment_method: paymentMethodId,
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update agent record
      await Agent.upgradeToPremium(
        req.user.id, 
        subscription.id, 
        customer.id,
        planId
      );

      res.json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          status: subscription.status,
          clientSecret: subscription.latest_invoice.payment_intent.client_secret,
          plan: plan.name
        }
      });

    } catch (error) {
      console.error('Subscription error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Cancel subscription
router.post('/cancel-subscription',
  authenticate,
  authorize('agent'),
  async (req, res) => {
    try {
      if (!ensureStripeAvailable(res)) return;

      const agent = await Agent.findByUserId(req.user.id);
      
      if (!agent || !agent.stripe_subscription_id) {
        return res.status(400).json({
          success: false,
          error: 'No active subscription found'
        });
      }

      // Cancel subscription at period end
      const subscription = await stripe.subscriptions.update(
        agent.stripe_subscription_id,
        { cancel_at_period_end: true }
      );

      await Agent.downgradeFromPremium(req.user.id);

      res.json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAt: subscription.cancel_at
        },
        message: 'Subscription will be canceled at the end of the billing period'
      });

    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Webhook handler for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    console.warn('Stripe webhook received but Stripe is not configured.');
    return res.status(503).json({ success: false, error: 'Payment service unavailable' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'invoice.payment_succeeded':
      handlePaymentSucceeded(event.data.object);
      break;
    case 'customer.subscription.deleted':
      handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_failed':
      handlePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({received: true});
});

// Webhook handlers
const handlePaymentSucceeded = async (invoice) => {
  try {
    const subscriptionId = invoice.subscription;
    await Agent.renewSubscription(subscriptionId);
    console.log(`Payment succeeded for subscription: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
};

const handleSubscriptionDeleted = async (subscription) => {
  try {
    await Agent.downgradeFromPremiumBySubscription(subscription.id);
    console.log(`Subscription canceled: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
};

const handlePaymentFailed = async (invoice) => {
  try {
    // Notify agent about payment failure
    console.log(`Payment failed for subscription: ${invoice.subscription}`);
    // Here you would typically send an email to the agent
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
};

// Get subscription status
router.get('/subscription/status', authenticate, authorize('agent'), async (req, res) => {
  try {
    if (!ensureStripeAvailable(res)) return;

    const agent = await Agent.findByUserId(req.user.id);
    
    if (!agent || !agent.stripe_subscription_id) {
      return res.json({
        success: true,
        data: {
          hasSubscription: false,
          isPremium: false
        }
      });
    }

    const subscription = await stripe.subscriptions.retrieve(agent.stripe_subscription_id);

    res.json({
      success: true,
      data: {
        hasSubscription: true,
        isPremium: agent.is_premium,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        plan: agent.subscription_plan
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
