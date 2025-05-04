const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');

const Vouchers = require('../models/voucher');
var authenticate = require('../authenticate');

const VoucherRouter = express.Router();

VoucherRouter.use(bodyParser.json());

VoucherRouter.route('/')
.options(cors.corsWithOptions, authenticate.verifyUser, (req, res) => { res.sendStatus(200); })
.get(cors.cors, async (req, res, next) => {
    try {
        const voucher = await Vouchers.find(req.query);
        res.status(200).json(voucher);
    } catch (error) {
        next(error);
    }
})
.post(cors.corsWithOptions, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Voucher name is required' });
        }

        const voucher = await Vouchers.findOne({ name });

        if (!voucher) {
            return res.status(404).json({ error: 'Voucher not found' });
        }

        res.status(200).json({ value: voucher.value });
    } catch (error) {
        next(error);
    }
});

VoucherRouter.route('/add')
.post(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    try {
        const { name, value } = req.body;
        if (!name || value === undefined) {
            return res.status(400).json({ error: 'Name and value are required' });
        }

        const existing = await Vouchers.findOne({ name });
        if (existing) {
            return res.status(409).json({ error: 'Voucher with this name already exists' });
        }

        const newVoucher = await Vouchers.create({ name, value });
        res.status(201).json(newVoucher);
    } catch (error) {
        next(error);
    }
});

VoucherRouter.route('/remove')
.post(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Voucher name is required' });
        }

        const result = await Vouchers.findOneAndDelete({ name });

        if (!result) {
            return res.status(404).json({ error: 'Voucher not found' });
        }

        res.status(200).json({ message: 'Voucher deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = VoucherRouter;
