const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voucherSchema = new Schema({
    name: { type: String, default: '' },
    value: { type: Number, default: 0 }
})

const Voucher = mongoose.model('Voucher', voucherSchema);
module.exports = Voucher;