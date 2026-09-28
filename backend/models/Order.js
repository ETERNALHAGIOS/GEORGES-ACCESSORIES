const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  items: [{
    productId: String,
    name: String,
    price: Number,
    qty: Number
  }],
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentReference: { type: String, default: '' },
  orderStatus: { type: String, enum: ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
