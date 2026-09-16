const { signPayload, verifySignature } = require('../security/SecurityMiddleware');
const { v4: uuidv4 } = require('uuid');

/**
 * Payment Service — Secure Checkout, Virtual Receipts & Wallet Verification
 */

// 🛡️ Session expiration time (5 minutes)
const SESSION_EXPIRY_MS = 5 * 60 * 1000;

class PaymentService {
  constructor() {
    this.catalog = {
      'pack-250': { id: 'pack-250', title: 'Pack Découverte', price: 0.00, coins: 250, type: 'free' },
      'pack-500': { id: 'pack-500', title: 'Pack Bronze', price: 1.49, coins: 500, type: 'money' },
      'pack-1500': { id: 'pack-1500', title: 'Pack Argent', price: 2.99, coins: 1500, type: 'money' },
      'pack-5000': { id: 'pack-5000', title: 'Pack Or', price: 6.99, coins: 5000, type: 'money' },
      'pack-15000': { id: 'pack-15000', title: 'Coffre Diamant', price: 14.99, coins: 15000, vip: true, type: 'money' },
      'pass-vip-month': { id: 'pass-vip-month', title: 'Pass VIP Mensuel', price: 4.99, vip: true, coins: 500, type: 'money' },
      'pass-vip-life': { id: 'pass-vip-life', title: 'Pass VIP À Vie', price: 14.99, vip: true, coins: 2000, type: 'money' },
    };

    // Simulated transactions database
    this.transactions = new Map();

    // 🛡️ Periodic cleanup of expired sessions
    setInterval(() => this._cleanupExpiredSessions(), 60000);
  }

  /**
   * 🛡️ Remove expired payment sessions
   */
  _cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, tx] of this.transactions.entries()) {
      const createdTime = new Date(tx.createdAt).getTime();
      if (now - createdTime > SESSION_EXPIRY_MS && tx.status === 'pending') {
        this.transactions.delete(sessionId);
      }
    }
  }

  /**
   * Create Checkout Session with HMAC Security Receipt Token
   */
  createSession(itemId, paymentMethod = 'card') {
    const item = this.catalog[itemId];
    if (!item) {
      throw new Error(`Article introuvable dans le catalogue : ${itemId}`);
    }

    const sessionId = 'cs_' + uuidv4().replace(/-/g, '').substring(0, 16);
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const createdAt = new Date().toISOString();

    const transactionData = {
      sessionId,
      orderId,
      itemId: item.id,
      itemTitle: item.title,
      price: item.price,
      currency: 'EUR',
      coins: item.coins || 0,
      vip: item.vip || false,
      paymentMethod,
      createdAt,
      status: 'pending'
    };

    const signature = signPayload(transactionData);
    transactionData.signature = signature;

    this.transactions.set(sessionId, transactionData);

    return {
      success: true,
      sessionId,
      orderId,
      item,
      signature,
      checkoutUrl: `/checkout?session=${sessionId}`
    };
  }

  /**
   * Verify Payment Session & Issue Cryptographic Wallet Signature
   * 🛡️ SECURITY: No longer accepts payments without a valid session
   */
  verifyPayment(sessionId, signature, userState = {}) {
    // 🛡️ Session MUST exist — no fallback for untracked payments
    if (!sessionId) {
      throw new Error('⚠️ ID de session de paiement manquant.');
    }

    const transaction = this.transactions.get(sessionId);
    if (!transaction) {
      throw new Error('⚠️ Session de paiement introuvable ou expirée. Veuillez réessayer.');
    }

    // 🛡️ Check session hasn't expired
    const sessionAge = Date.now() - new Date(transaction.createdAt).getTime();
    if (sessionAge > SESSION_EXPIRY_MS) {
      this.transactions.delete(sessionId);
      throw new Error('⚠️ Session de paiement expirée (5 min max). Veuillez créer une nouvelle commande.');
    }

    // 🛡️ Prevent replay: check if already completed
    if (transaction.status === 'completed') {
      throw new Error('⚠️ Cette transaction a déjà été validée (protection anti-replay).');
    }

    // 🛡️ Verify HMAC signature integrity
    if (!verifySignature(transaction, signature)) {
      throw new Error('⚠️ Transaction corrompue ou signature de paiement invalide (Anti-Falsification).');
    }

    transaction.status = 'completed';
    transaction.completedAt = new Date().toISOString();

    const receiptId = 'REC-' + uuidv4().substring(0, 8).toUpperCase();
    const newCoins = (userState.coins || 0) + (transaction.coins || 0);
    const newVip = userState.isVip || transaction.vip || false;

    const signedWallet = signPayload({
      coins: newCoins,
      isVip: newVip,
      receiptId,
      timestamp: Date.now()
    });

    return {
      success: true,
      receiptId,
      orderId: transaction.orderId,
      itemTitle: transaction.itemTitle,
      coinsAdded: transaction.coins,
      vipGranted: transaction.vip,
      newCoinsBalance: newCoins,
      newVipStatus: newVip,
      signedWallet,
      verified: true,
      message: `Paiement de ${transaction.itemTitle} validé ! Vos avantages ont été ajoutés à votre compte.`
    };
  }

  /**
   * Validate Client Wallet Integrity
   */
  validateWallet(coins, isVip, clientSignature) {
    const payload = { coins, isVip };
    const isValid = verifySignature(payload, clientSignature);
    return {
      valid: isValid,
      coins,
      isVip
    };
  }
}

module.exports = new PaymentService();

