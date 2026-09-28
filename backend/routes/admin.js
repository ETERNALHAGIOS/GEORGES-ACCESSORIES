const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/admin/login  { key: "the admin key" }
// Returns a short-lived token the admin panel stores and sends on every
// protected request. There is no admin account/username by design —
// just the one shared key you set as ADMIN_KEY in your .env file.
router.post('/login', (req, res) => {
  const { key } = req.body;
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Incorrect admin key' });
  }
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

module.exports = router;
