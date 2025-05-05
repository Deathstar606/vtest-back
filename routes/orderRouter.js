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
  try {
    const transId = req.params.tranId;

    // 1. Find order by transaction ID
    const order = await Order.findOne({ transaction_id: transId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // 2. Issue token from Pathao
    const tokenRes = await axios.post(
      'https://courier-api-sandbox.pathao.com/aladdin/api/v1/issue-token',
      {
        client_id: '7N1aMJQbWm',
        client_secret: 'wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39',
        grant_type: 'password',
        username: 'test@pathao.com',
        password: 'lovePathao',
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const accessToken = tokenRes.data.access_token;

    // 3. Create a Pathao delivery order
    const pathaoOrderRes = await axios.post(
      'https://courier-api-sandbox.pathao.com/aladdin/api/v1/orders',
      {
        store_id: 148424, // Replace with your actual merchant store ID
        merchant_order_id: transId,
        recipient_name: order.firstName,
        recipient_phone: order.phoneNumber,
        recipient_address: order.address,
        recipient_city: 1, // Example city_id
        recipient_zone: 17, // Example zone_id
        recipient_area: 3, // Example area_id
        delivery_type: 48,
        item_type: 2,
        special_instruction: 'Deliver before 5 PM',
        item_quantity: order.items.length,
        item_weight: '0.5',
        item_description: 'Multiple clothing items',
        amount_to_collect: order.total,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const deliveryData = pathaoOrderRes.data.data;

    // 4. Update your order with delivery info
    order.deliveryDetails = deliveryData;
    order.order_stat = 'Payment Success & Delivery Created';
    await order.save();

    res.json({
      message: 'Payment success and delivery order created',
      deliveryDetails: deliveryData,
    });
  } catch (err) {
    console.error('Error in Pathao order creation:', err.response?.data || err);
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

orderRouter.route('/pathao-token')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.corsWithOptions, async (req, res) => {
  try {
    // 2. Issue token from Pathao
    const tokenRes = await axios.post(
      'https://courier-api-sandbox.pathao.com/aladdin/api/v1/issue-token',
      {
        client_id: '7N1aMJQbWm',
        client_secret: 'wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39',
        grant_type: 'password',
        username: 'test@pathao.com',
        password: 'lovePathao',
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    res.json({ access_token: tokenRes.data.access_token });
  } catch (err) {
    console.error('Failed to get token:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch access token' });
  }
});

orderRouter.route('/pathao-store-id')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.corsWithOptions, async (req, res) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token missing from Authorization header' });
  }

  try {
    const { data } = await axios.get('https://courier-api-sandbox.pathao.com/aladdin/api/v1/stores', {
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.json(data);
  } catch (err) {
    console.error('Failed to get store ID:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch store info' });
  }
});

module.exports = orderRouter;
