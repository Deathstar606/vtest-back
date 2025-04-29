const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const SSLCommerzPayment = require('sslcommerz-lts');
const cors = require('./cors');

const Order = require('../models/order'); // adjust path as needed
const Cloth = require("../models/clothes")

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
    const item = encodeURIComponent(JSON.stringify(order.items))
    const trans_id = new mongoose.Types.ObjectId().toString();
    const data = {
        total_amount: order.total,
        currency: 'BDT',
        tran_id: trans_id,
        success_url: `https://vtest-back.vercel.app/orders/success/${trans_id}/${item}`, //http://localhost:9000/
        fail_url: 'http://localhost:3030/fail',
        cancel_url: 'http://localhost:3030/cancel',
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

orderRouter.route('/success/:tranId/:items')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, async (req, res, next) => {
  console.log("Payment success callback received");

  try {
    const transactionId = req.params.tranId;
    const rawItems = req.params.items;
    console.log("WTF are You", rawItems)
    // Decode and parse the items array
    const items = JSON.parse(decodeURIComponent(rawItems));
    console.log("Parsed items:", items);

    // Update payment status
    const updatedOrder = await Order.findOneAndUpdate(
      { transaction_id: transactionId },
      { $set: { payment_stat: true } },
      { new: true }
    );

    if (!updatedOrder) {
      console.log("Transaction not found for ID:", transactionId);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Loop through all items and update stock & ordered count
    for (const item of items) {
      const { category, _id: clothesId, size, quantity } = item;

      const categoryDoc = await Cloth.findOne({ category });
      if (!categoryDoc) {
        console.log(`Category '${category}' not found`);
        continue;
      }

      const clothingItem = categoryDoc.items.id(clothesId);
      if (!clothingItem) {
        console.log(`Clothing item with ID '${clothesId}' not found in category '${category}'`);
        continue;
      }

      // Ensure size exists
      if (!clothingItem.size || !clothingItem.size.has(size)) {
        console.log(`Size '${size}' not found in item '${clothesId}'`);
        continue;
      }

      // Decrement quantity for the specific size
      const currentQty = clothingItem.size.get(size);
      clothingItem.size.set(size, Math.max(0, currentQty - quantity));

      // Increment ordered field
      clothingItem.ordered = (clothingItem.ordered || 0) + quantity;

      // Save the updated document
      await categoryDoc.save();
      console.log("every Update has been completed")
    }

    // Final redirect
    res.redirect(`https://deathstar606.github.io/vtest-front/#/home/paystat/${transactionId}`);
  } catch (err) {
    console.error("Error processing payment success callback:", err);
    next(err);
  }
});

module.exports = orderRouter;
