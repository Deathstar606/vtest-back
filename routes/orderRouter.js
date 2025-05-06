const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
const SSLCommerzPayment = require('sslcommerz-lts');
const cors = require('./cors');

const Order = require('../models/order'); // adjust path as needed
const Cloth = require("../models/clothes")

const { generateEmailHtml } = require('../utils/emailTemplate');

const orderRouter = express.Router();
var authenticate = require('../authenticate');

const store_id = "demo667d30040fbc3";
const store_passwd = "demo667d30040fbc3@ssl";
const is_live = false;

orderRouter.use(bodyParser.json());

orderRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, async (req, res, next) => {
    try {
      const orders = await Order.find(req.query)
      res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
})
.post(cors.corsWithOptions, async (req, res, next) => {
  try {
    let order = req.body;
    const trans_id = new mongoose.Types.ObjectId().toString();
    const data = {
        total_amount: order.total,
        currency: 'BDT',
        tran_id: trans_id,
        success_url: `http://localhost:9000/orders/success/${trans_id}`, //https://vtest-back.vercel.app/
        fail_url: `https://vtest-back.vercel.app/orders/fail/${trans_id}`,
        cancel_url: `https://vtest-back.vercel.app/cancle/${trans_id}`,
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: order.firstName,
        cus_email: order.email,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);
    let GatewayPageURL = apiResponse.GatewayPageURL;
    
    const finalOrder = {
      firstName: order.firstName,
      lastName: order.lastName,
      address: order.address,
      email: order.email,
      phoneNumber: order.phoneNumber,
      order_stat: order.order_stat,
      total: order.total,
      items: order.items, 
      transaction_id: trans_id
    };
    console.log('Redirecting to: ', GatewayPageURL);

    await Order.create(finalOrder);

    res.send({ url: GatewayPageURL });
  } catch (err) {
      console.error('Error during processing:', err);
      next(err);
  }
});

orderRouter.route('/success/:tranId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, async (req, res, next) => {
  console.log("Payment success callback received");

  try {
    const transactionId = req.params.tranId;

    const order = await Order.findOneAndUpdate(
      { transaction_id: transactionId },
      { $set: { payment_stat: true } },
      { new: true }
    );

    if (!order) {
      console.log("Transaction not found for ID:", transactionId);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const items = order.items;

    for (const item of items) {
      const { category, _id, size, quantity } = item;

      const categoryDoc = await Cloth.findOne({ category });
      if (!categoryDoc) {
        console.log(`Category '${category}' not found`);
        continue;
      }

      const clothingItem = categoryDoc.items.id(_id);
      if (!clothingItem) {
        console.log(`Clothing item with ID '${_id}' not found`);
        continue;
      }

      if (!clothingItem.size || !clothingItem.size.has(size)) {
        console.log(`Size '${size}' not found in item '${_id}'`);
        continue;
      }

      const currentQty = clothingItem.size.get(size);
      clothingItem.size.set(size, Math.max(0, currentQty - quantity));
      clothingItem.ordered = (clothingItem.ordered || 0) + quantity;

      await categoryDoc.save();
    }

    const htmlContent = generateEmailHtml(
      order.firstName,
      "Your order has been confirmed!",
      items.map(({ name, category, _id }) => ({ name, category, _id }))
    );

    await axios.post("http://localhost:9000/mail", {
      subject: "Order Confirmation",
      htmlContent,
      email: order.email,
      message: `Order ${transactionId} has been confirmed.`
    });
    
    res.redirect(`http://localhost:3000/Veloura#/home/paystat/${transactionId}`);
  } catch (err) {
    console.error("Error processing payment success callback:", err);
    next(err);
  }
});

orderRouter.route('/fail/:tranId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, async (req, res, next) => {
  try {
    const transactionId = req.params.tranId;

    // Optionally remove the order if payment failed
    await Order.findOneAndDelete({ transaction_id: transactionId });
    console.log("deleted Successfully")
    // Redirect user to failure page on frontend
    res.redirect(`http://Deathstar606.github.io/vtest-front/#/home/failure/${transactionId}`);
  } catch (err) {
    console.error("Error handling payment failure:", err);
    next(err);
  }
});

orderRouter.route('/cancle/:tranId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, async (req, res, next) => {
  try {
    const transactionId = req.params.tranId;

    // Optionally remove the order if payment failed
    await Order.findOneAndDelete({ transaction_id: transactionId });
    console.log("deleted Successfully")
    // Redirect user to failure page on frontend
    res.redirect(`http://Deathstar606.github.io/vtest-front/#/home/cancle/${transactionId}`);
  } catch (err) {
    console.error("Error handling payment failure:", err);
    next(err);
  }
});

module.exports = orderRouter;
