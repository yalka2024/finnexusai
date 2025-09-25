// apps/backend/src/services/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  async createPaymentIntent(amount, currency = 'usd') {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['card']
      });
      return paymentIntent;
    } catch (error) {
      throw new Error(`Payment processing failed: ${  error.message}`);
    }
  }
}

module.exports = new PaymentService();
