const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Customer = require('../models/Customer');
const router = express.Router();

function makeToken(customer) {
  return jwt.sign({ role: 'customer', id: customer._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}
function publicCustomer(customer) {
  return { name: customer.name, email: customer.email };
}

// POST /api/auth/signup  { name, email, password }
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const existing = await Customer.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists — try signing in instead' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const customer = await Customer.create({ name, email: email.toLowerCase().trim(), passwordHash });
  res.status(201).json({ token: makeToken(customer), customer: publicCustomer(customer) });
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const customer = await Customer.findOne({ email: email.toLowerCase().trim() });
  if (!customer) return res.status(401).json({ error: 'Incorrect email or password' });

  const match = await bcrypt.compare(password, customer.passwordHash);
  if (!match) return res.status(401).json({ error: 'Incorrect email or password' });

  res.json({ token: makeToken(customer), customer: publicCustomer(customer) });
});

module.exports = router;
