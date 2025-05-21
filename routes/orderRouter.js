const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
const SSLCommerzPayment = require('sslcommerz-lts');
const cors = require('./cors');

const { frontend, backend } = require('../baseUrl');

const Order = require('../models/order'); // adjust path as needed
const Cloth = require("../models/clothes")

const { generateEmailHtml } = require('../utils/emailTemplate');

const orderRouter = express.Router();
var authenticate = require('../authenticate');

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWD;
const is_live = true;

orderRouter.use(bodyParser.json());

orderRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, async (req, res, next) => {
  try {
    // Remove orders with order_stat "online" and payment_stat false
    await Order.deleteMany({ order_stat: "online", payment_stat: false });

    // Fetch remaining orders based on request query
    const orders = await Order.find(req.query);
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
})
.post(cors.corsWithOptions, async (req, res, next) => {
  console.log("Order request received");
  try {
    let order = req.body;
    const trans_id = new mongoose.Types.ObjectId().toString();

    // Determine amount based on order_stat
    const isPartialCOD = order.order_stat === 'partialcod';
    const amountToCharge = isPartialCOD ? order.delivery : order.total;

    const data = {
      total_amount: amountToCharge,
      currency: 'BDT',
      tran_id: trans_id,
      success_url: `${backend}orders/success/${trans_id}`, // change for production
      fail_url: `${backend}orders/fail/${trans_id}`,
      cancel_url: `${backend}orders/cancle/${trans_id}`,
      ipn_url: `${backend}orders/ipn`,
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
      delivery: order.delivery,
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
      order.items,
      order.phoneNumber,
      order.address,
      order.order_stat,
      order.delivery,
      order.total,
      order.transaction_id,
    );
    console.log("ready to send")
    await axios.post(`${backend}mail`, {
      subject: "Order Confirmation",
      htmlContent,
      email: order.email,
      message: `Order ${transactionId} has been confirmed.`
    });
    
    res.redirect(`${frontend}Veloura#/home/paystat/${transactionId}`);
  } catch (err) {
    console.error("Error processing payment success callback:", err);
    next(err);
  }
});

orderRouter.route('/fail/:tranId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, async (req, res, next) => {
  console.log("Payment failure callback received");
  try {
    const transactionId = req.params.tranId;

    // Optionally remove the order if payment failed
    await Order.findOneAndDelete({ transaction_id: transactionId });
    console.log("deleted Successfully")
    // Redirect user to failure page on frontend
    res.redirect(`${frontend}#/home/failure/${transactionId}`);
  } catch (err) {
    console.error("Error handling payment failure:", err);
    next(err);
  }
});

orderRouter.route('/cancle/:tranId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, async (req, res, next) => {
    console.log("Payment cancle callback received");
  try {
    const transactionId = req.params.tranId;

    // Optionally remove the order if payment failed
    await Order.findOneAndDelete({ transaction_id: transactionId });
    console.log("deleted Successfully")
    // Redirect user to failure page on frontend
    res.redirect(`${frontend}#/home/cancle/${transactionId}`);
  } catch (err) {
    console.error("Error handling payment failure:", err);
    next(err);
  }
});

orderRouter.route('/ipn')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, async (req, res, next) => {
  try {
    const ipnData = req.body;

    // Optional: Log or store the raw IPN data
    console.log("IPN Data Received:", ipnData);

    // Step 1: Validate the IPN by calling the SSLCommerz validation API
    const validationURL = `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${ipnData.val_id}&store_id=${store_id}&store_passwd=${store_passwd}&v=1&format=json`;

    const validationRes = await fetch(validationURL);
    const validationData = await validationRes.json();

    console.log("Validated IPN:", validationData);

    if (
      validationData.status === "VALID" &&
      validationData.risk_level === "0"
    ) {
      // Update order in DB to reflect successful payment
      await Order.findOneAndUpdate(
        { transaction_id: validationData.tran_id },
        { payment_stat: true },
      );

      return res.status(200).send("IPN processed successfully.");
    }

    return res.status(400).send("IPN validation failed.");
  } catch (err) {
    console.error("Error handling IPN:", err);
    res.status(500).send("Server error while handling IPN");
  }
});


orderRouter.route('/colmplete/:tranId')
  .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
  .post(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    try {
      const transactionId = req.params.tranId;

      const order = await Order.findOne({ transaction_id: transactionId });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      order.completion = !order.completion;
      await order.save();

      console.log("Order completion status toggled successfully");
      res.status(200).json({
        message: "Order completion status updated",
        completion: order.completion,
      });

    } catch (err) {
      console.error("Error updating order completion:", err);
      next(err);
    }
});

orderRouter.route('/delete/:tranId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
  try {
    const transactionId = req.params.tranId;

    const deletedOrder = await Order.findOneAndDelete({ transaction_id: transactionId });

    if (!deletedOrder) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    console.log("Deleted successfully");
    res.status(200).json({ success: true, message: "Order deleted successfully refresh please." });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ success: false, message: "Server error while deleting order." });
  }
});

orderRouter.route('/cod').post(async (req, res, next) => {
  try {
    const order = req.body;
    const trans_id = new mongoose.Types.ObjectId().toString();

    const finalOrder = {
      firstName: order.firstName,
      lastName: order.lastName,
      address: order.address,
      email: order.email,
      phoneNumber: order.phoneNumber,
      order_stat: order.order_stat,
      delivery: order.delivery,
      total: order.total,
      items: order.items,
      transaction_id: trans_id
    };

    await Order.create(finalOrder);

    const transactionId = trans_id;

    const savedOrder = await Order.findOne({ transaction_id: transactionId });

    if (!savedOrder) {
      console.log("Transaction not found for ID:", transactionId);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const items = savedOrder.items;

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
/*       savedOrder.transaction_id, */
      savedOrder.firstName,
      "Your order has been confirmed!",
      savedOrder.items,
      savedOrder.phoneNumber,
      savedOrder.address,
      savedOrder.order_stat,
      savedOrder.delivery,
      savedOrder.total,
      savedOrder.transaction_id,
    );

    await axios.post(`${backend}mail`, {
      subject: "Order Confirmation",
      htmlContent,
      email: savedOrder.email,
      message: `Order ${transactionId} has been confirmed.`
    });

    res.status(200).json({ success: true, message: "Order placed successfully" });
  } catch (err) {
    console.error("Error processing COD order:", err);
    next(err);
  }
});

module.exports = orderRouter;
