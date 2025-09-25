const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class PaymentService {
  constructor() {
    this.stripe = stripe;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Test Stripe connection
      if (process.env.STRIPE_SECRET_KEY) {
        await this.stripe.balance.retrieve();
        logger.info('Payment Service initialized with Stripe');
      } else {
        logger.warn('Payment Service initialized in mock mode (no Stripe key)');
      }

      this.isInitialized = true;
      return { success: true, message: 'Payment Service initialized' };
    } catch (error) {
      logger.error('Payment Service initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.isInitialized = false;
      logger.info('Payment Service shut down');
      return { success: true, message: 'Payment Service shut down' };
    } catch (error) {
      logger.error('Payment Service shutdown failed:', error);
      throw error;
    }
  }

  // Create payment intent
  async createPaymentIntent(userId, amount, currency = 'usd', metadata = {}) {
    try {
      const client = await databaseManager.getClient();

      try {
        await client.query('BEGIN');

        // Create payment record
        const paymentResult = await client.query(`
          INSERT INTO payments (
            user_id, amount, currency, status, payment_type, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          userId,
          amount * 100, // Convert to cents
          currency,
          'pending',
          'deposit',
          JSON.stringify(metadata)
        ]);

        const payment = paymentResult.rows[0];

        if (process.env.STRIPE_SECRET_KEY) {
          // Create Stripe payment intent
          const paymentIntent = await this.stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: currency,
            metadata: {
              paymentId: payment.id,
              userId: userId,
              ...metadata
            },
            automatic_payment_methods: {
              enabled: true
            }
          });

          // Update payment with Stripe ID
          await client.query(
            'UPDATE payments SET external_id = $1 WHERE id = $2',
            [paymentIntent.id, payment.id]
          );

          await client.query('COMMIT');

          return {
            success: true,
            payment: this.formatPayment(payment),
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
          };
        } else {
          // Mock payment intent for development
          const mockPaymentIntent = {
            id: `pi_mock_${Date.now()}`,
            client_secret: `pi_mock_${Date.now()}_secret`,
            status: 'requires_payment_method'
          };

          await client.query(
            'UPDATE payments SET external_id = $1 WHERE id = $2',
            [mockPaymentIntent.id, payment.id]
          );

          await client.query('COMMIT');

          return {
            success: true,
            payment: this.formatPayment(payment),
            clientSecret: mockPaymentIntent.client_secret,
            paymentIntentId: mockPaymentIntent.id
          };
        }

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Payment intent creation failed:', error);
      throw error;
    }
  }

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    try {
      const client = await databaseManager.getClient();

      try {
        await client.query('BEGIN');

        // Get payment record
        const paymentResult = await client.query(
          'SELECT * FROM payments WHERE external_id = $1',
          [paymentIntentId]
        );

        if (paymentResult.rows.length === 0) {
          throw new Error('Payment not found');
        }

        const payment = paymentResult.rows[0];

        if (process.env.STRIPE_SECRET_KEY) {
          // Retrieve payment intent from Stripe
          const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

          if (paymentIntent.status === 'succeeded') {
            // Update payment status
            await client.query(
              'UPDATE payments SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2',
              ['completed', payment.id]
            );

            // Update user balance
            await this.updateUserBalance(client, payment.user_id, payment.amount, payment.currency);

            await client.query('COMMIT');

            return {
              success: true,
              payment: this.formatPayment({ ...payment, status: 'completed' }),
              message: 'Payment confirmed successfully'
            };
          } else {
            throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
          }
        } else {
          // Mock payment confirmation
          await client.query(
            'UPDATE payments SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['completed', payment.id]
          );

          await this.updateUserBalance(client, payment.user_id, payment.amount, payment.currency);

          await client.query('COMMIT');

          return {
            success: true,
            payment: this.formatPayment({ ...payment, status: 'completed' }),
            message: 'Payment confirmed successfully (mock)'
          };
        }

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Payment confirmation failed:', error);
      throw error;
    }
  }

  // Process withdrawal
  async processWithdrawal(userId, amount, currency, destination) {
    try {
      const client = await databaseManager.getClient();

      try {
        await client.query('BEGIN');

        // Check user balance
        const balanceResult = await client.query(
          'SELECT balance FROM user_wallets WHERE user_id = $1 AND asset_id = (SELECT id FROM assets WHERE symbol = $2)',
          [userId, currency.toUpperCase()]
        );

        if (balanceResult.rows.length === 0 || parseFloat(balanceResult.rows[0].balance) < amount) {
          throw new Error('Insufficient balance');
        }

        // Create withdrawal record
        const withdrawalResult = await client.query(`
          INSERT INTO payments (
            user_id, amount, currency, status, payment_type, 
            destination, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          userId,
          amount * 100, // Convert to cents
          currency,
          'pending',
          'withdrawal',
          destination,
          JSON.stringify({ type: 'withdrawal' })
        ]);

        const withdrawal = withdrawalResult.rows[0];

        if (process.env.STRIPE_SECRET_KEY) {
          // Create Stripe transfer
          const transfer = await this.stripe.transfers.create({
            amount: amount * 100, // Convert to cents
            currency: currency,
            destination: destination,
            metadata: {
              paymentId: withdrawal.id,
              userId: userId
            }
          });

          // Update withdrawal with Stripe ID
          await client.query(
            'UPDATE payments SET external_id = $1 WHERE id = $2',
            [transfer.id, withdrawal.id]
          );

          // Update withdrawal status
          await client.query(
            'UPDATE payments SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['completed', withdrawal.id]
          );

          // Update user balance
          await this.updateUserBalance(client, userId, -amount, currency);

          await client.query('COMMIT');

          return {
            success: true,
            withdrawal: this.formatPayment(withdrawal),
            transferId: transfer.id,
            message: 'Withdrawal processed successfully'
          };
        } else {
          // Mock withdrawal processing
          await client.query(
            'UPDATE payments SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['completed', withdrawal.id]
          );

          await this.updateUserBalance(client, userId, -amount, currency);

          await client.query('COMMIT');

          return {
            success: true,
            withdrawal: this.formatPayment(withdrawal),
            transferId: `mock_transfer_${Date.now()}`,
            message: 'Withdrawal processed successfully (mock)'
          };
        }

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Withdrawal processing failed:', error);
      throw error;
    }
  }

  // Update user balance
  async updateUserBalance(client, userId, amount, currency) {
    try {
      // Get or create user wallet
      const walletResult = await client.query(`
        SELECT id, balance FROM user_wallets 
        WHERE user_id = $1 AND asset_id = (SELECT id FROM assets WHERE symbol = $2)
      `, [userId, currency.toUpperCase()]);

      if (walletResult.rows.length === 0) {
        // Create new wallet
        await client.query(`
          INSERT INTO user_wallets (user_id, asset_id, balance)
          VALUES ($1, (SELECT id FROM assets WHERE symbol = $2), $3)
        `, [userId, currency.toUpperCase(), amount]);
      } else {
        // Update existing wallet
        const currentBalance = parseFloat(walletResult.rows[0].balance);
        const newBalance = currentBalance + amount;

        await client.query(
          'UPDATE user_wallets SET balance = $1 WHERE user_id = $2 AND asset_id = (SELECT id FROM assets WHERE symbol = $3)',
          [newBalance, userId, currency.toUpperCase()]
        );
      }
    } catch (error) {
      logger.error('Failed to update user balance:', error);
      throw error;
    }
  }

  // Get user payments
  async getUserPayments(userId, limit = 50, offset = 0) {
    try {
      const result = await databaseManager.query(`
        SELECT * FROM payments 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      const payments = result.rows.map(payment => this.formatPayment(payment));

      // Get total count
      const countResult = await databaseManager.query(
        'SELECT COUNT(*) as total FROM payments WHERE user_id = $1',
        [userId]
      );

      return {
        success: true,
        payments,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (error) {
      logger.error('Failed to get user payments:', error);
      throw error;
    }
  }

  // Get user balance
  async getUserBalance(userId, currency = 'USD') {
    try {
      const result = await databaseManager.query(`
        SELECT uw.balance, a.symbol, a.name
        FROM user_wallets uw
        JOIN assets a ON uw.asset_id = a.id
        WHERE uw.user_id = $1 AND a.symbol = $2
      `, [userId, currency.toUpperCase()]);

      if (result.rows.length === 0) {
        return {
          success: true,
          balance: {
            currency: currency.toUpperCase(),
            amount: 0,
            symbol: currency.toUpperCase()
          }
        };
      }

      const wallet = result.rows[0];
      return {
        success: true,
        balance: {
          currency: wallet.symbol,
          amount: parseFloat(wallet.balance),
          symbol: wallet.symbol,
          name: wallet.name
        }
      };
    } catch (error) {
      logger.error('Failed to get user balance:', error);
      throw error;
    }
  }

  // Get all user balances
  async getAllUserBalances(userId) {
    try {
      const result = await databaseManager.query(`
        SELECT uw.balance, a.symbol, a.name, a.asset_type
        FROM user_wallets uw
        JOIN assets a ON uw.asset_id = a.id
        WHERE uw.user_id = $1 AND uw.balance > 0
        ORDER BY uw.balance DESC
      `, [userId]);

      const balances = result.rows.map(wallet => ({
        currency: wallet.symbol,
        amount: parseFloat(wallet.balance),
        symbol: wallet.symbol,
        name: wallet.name,
        assetType: wallet.asset_type
      }));

      return {
        success: true,
        balances
      };
    } catch (error) {
      logger.error('Failed to get all user balances:', error);
      throw error;
    }
  }

  // Webhook handler for Stripe events
  async handleStripeWebhook(payload, signature) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe not configured');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
      case 'payment_intent.succeeded':
        await this.confirmPayment(event.data.object.id);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object.id);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
      }

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  // Handle payment failure
  async handlePaymentFailure(paymentIntentId) {
    try {
      await databaseManager.query(
        'UPDATE payments SET status = $1 WHERE external_id = $2',
        ['failed', paymentIntentId]
      );

      logger.info(`Payment failed: ${paymentIntentId}`);
    } catch (error) {
      logger.error('Failed to handle payment failure:', error);
    }
  }

  // Helper methods
  formatPayment(payment) {
    return {
      id: payment.id,
      userId: payment.user_id,
      amount: parseFloat(payment.amount) / 100, // Convert from cents
      currency: payment.currency,
      status: payment.status,
      paymentType: payment.payment_type,
      externalId: payment.external_id,
      destination: payment.destination,
      metadata: payment.metadata ? JSON.parse(payment.metadata) : {},
      createdAt: payment.created_at,
      processedAt: payment.processed_at
    };
  }
}

module.exports = new PaymentService();

