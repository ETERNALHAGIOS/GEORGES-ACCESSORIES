const express = require('express');
const Product = require('../models/Product');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/products — public, powers the customer shop
router.get('/', async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

// POST /api/products — admin only, add a new product
router.post('/', requireAdmin, async (req, res) => {
  const { name, tag, category, price, image, inStock } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }
  const product = await Product.create({ name, tag, category, price, image, inStock });
  res.status(201).json(product);
});

// PUT /api/products/:id — admin only, edit price / image / anything
router.put('/:id', requireAdmin, async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// DELETE /api/products/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
});

module.exports = router;
