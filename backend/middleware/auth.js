const jwt = require('jsonwebtoken');

// Protects admin-only routes. The admin frontend sends the token it got
// from POST /api/admin/login as "Authorization: Bearer <token>".
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing admin token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('Not an admin token');
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
}

// Protects "my orders" style routes. Doesn't fail the request if there's no
// token — customers can still check out as a guest.
function attachCustomerIfPresent(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role === 'customer') req.customerId = payload.id;
  } catch (err) {
    // Invalid/expired token — just treat as a guest, don't block checkout.
  }
  next();
}

// Requires a logged-in customer (used by GET /api/orders/mine).
function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'customer') throw new Error('Not a customer token');
    req.customerId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { requireAdmin, requireCustomer, attachCustomerIfPresent };
