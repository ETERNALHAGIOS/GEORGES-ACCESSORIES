const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tag: { type: String, default: '' },
    category: { type: String, default: 'General', trim: true },
  price: { type: Number, required: true },
  image: { type: String, default: '' }, // base64 data URL uploaded from the admin panel
  inStock: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
