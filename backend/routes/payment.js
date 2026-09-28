const express = require('express');
const axios = require('axios');
const Order = require('../models/Order');
const router = express.Router();

const PAYSTACK_BASE = 'https://api.paystack.co';

// POST /api/payment/initialize  { orderId, email }
// Starts a Paystack transaction (card or Mobile Money) and returns the
// checkout URL to redirect the customer to. Money is settled by Paystack
// straight into the bank account / Mobile Money wallet you connect in
// your own Paystack dashboard — this server never touches the funds.
router.post('/initialize', async (req, res) => {
  const { orderId, email } = req.body;
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  try {
    const response = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email: email || 'customer@kwamephones.com',
        amount: Math.round(order.total * 100), // Paystack expects the smallest unit (pesewas)
        currency: 'GHS',
        metadata: { orderId: order._id.toString() },
        callback_url: `${process.env.FRONTEND_URL}/order-success.html`
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    res.json(response.data.data); // { authorization_url, access_code, reference }
  } catch (err) {
    res.status(500).json({
      error: 'Could not start payment',
      detail: err.response ? err.response.data : err.message
    });
  }
});

// GET /api/payment/verify/:reference
// Called by the frontend after Paystack redirects the customer back.
// Confirms the payment really succeeded and marks the order paid.
router.get('/verify/:reference', async (req, res) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${req.params.reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const data = response.data.data;
    if (data.status === 'success' && data.metadata && data.metadata.orderId) {
      await Order.findByIdAndUpdate(data.metadata.orderId, {
        paymentStatus: 'paid',
        paymentReference: data.reference
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: 'Verification failed',
      detail: err.response ? err.response.data : err.message
    });
  }
});

module.exports = router;
