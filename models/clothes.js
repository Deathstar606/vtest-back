const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the item sub-schema with timestamps
const itemSchema = new Schema({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  best: { type: Boolean, default: false },
  images: {
    type: Map,
    of: [String]
  },
  color: [String],
  size: {
    type: Map,
    of: Number,
    required: true
  },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: null },
  ordered: {  type: Number, default: 0 }
}, { timestamps: true }); // <--- This enables timestamps for each item

// Main clothes schema
const clothesSchema = new Schema({
  category: { type: String, required: true, unique: true },
  items: [itemSchema] // <--- Use the sub-schema here
}, { timestamps: true });

const Cloth = mongoose.model('Cloth', clothesSchema);
module.exports = Cloth;
