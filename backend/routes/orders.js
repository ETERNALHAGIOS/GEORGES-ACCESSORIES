const express = require('express');
const Order = require('../models/Order');
const { requireAdmin, requireCustomer, attachCustomerIfPresent } = require('../middleware/auth');
const router = express.Router();

// POST /api/orders — public, a customer places an order from checkout.
// If they're signed in (Authorization header present), the order gets
// linked to their account so it shows up under "My Orders". If not,
// it's still saved as a guest order — signing in is never required to buy.
router.post('/', attachCustomerIfPresent, async (req, res) => {
  const { customerName, phone, address, items, total } = req.body;
  if (!customerName || !phone || !address || !items || !items.length) {
    return res.status(400).json({ error: 'Missing required order details' });
  }
  const order = await Order.create({
    customer: req.customerId || null,
    customerName, phone, address, items, total
  });
  res.status(201).json(order);
});

// GET /api/orders/mine — a signed-in customer's own order history
router.get('/mine', requireCustomer, async (req, res) => {
  const orders = await Order.find({ customer: req.customerId }).sort({ createdAt: -1 });
  res.json(orders);
});

// GET /api/orders — admin only, the order dashboard list
router.get('/', requireAdmin, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

// PATCH /api/orders/:id — admin only, mark confirmed/shipped/delivered etc.
router.patch('/:id', requireAdmin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

module.exports = router;
