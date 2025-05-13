const express = require('express');
const path = require('path');
const logger = require('morgan');
const passport = require('passport');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const connectToDatabase = require('./utils/db');
const mongoose = require('mongoose');

// Optional but recommended
mongoose.set('useCreateIndex', true);
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false); // 💡 prevent buffering when disconnected

const index = require('./routes/index');
const users = require('./routes/users');
const cloth = require('./routes/clothesRouter');
const order = require('./routes/orderRouter');
const voucher = require('./routes/voucherRouter');
const mail = require('./routes/mailRouter');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://deathstar606.github.io",
      "https://vtest-front.vercel.app",
      "http://localhost:3000",
      "https://sandbox.sslcommerz.com",
      "null",
      "https://velourabd.com",
      "https://www.velourabd.com",
      "https://veloura-staging.vercel.app",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const error = new Error(`Not allowed by CORS: ${origin}`);
      error.status = 403;
      callback(error);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

const app = express();

app.use(cors(corsOptions));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

// ✅ Ensure DB connection before handling requests
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('Error connecting to DB:', err);
    res.status(500).json({ error: 'Database connection error' });
  }
});

app.use('/', index);
app.use('/users', users);
app.use('/clothes', cloth);
app.use('/orders', order);
app.use('/mail', mail);
app.use('/voucher', voucher);
app.use(express.static(path.join(__dirname, 'public')));

// Catch 404
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', {
    title: 'Error',
    message: err.message,
    error: err
  });
});

// Start server (used locally only — not needed for Vercel)
if (!process.env.VERCEL) {
  const http = require('http');
  const server = http.createServer(app);
  server.setTimeout(10000);
  server.listen(process.env.PORT || 9000, () => {
    console.log('Server listening on port', process.env.PORT || 9000);
  });
}

module.exports = app;
