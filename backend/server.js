require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 10mb so product images (base64) fit

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.send('Kwame Phones & Accessories API is running.'));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
