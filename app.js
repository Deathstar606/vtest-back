var express = require('express');
var path = require('path');
var logger = require('morgan');
var passport = require('passport');
var bodyParser = require('body-parser');
var config = require('./config');
const cors = require('cors');
require('dotenv').config();

var index = require('./routes/index');
var users = require('./routes/users');
var cloth = require('./routes/clothesRouter')
var order = require('./routes/orderRouter')

const mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);

// Connection URL
const url = config.mongoUrl;
console.log(url)
const connect = mongoose.connect(url, 
  { useNewUrlParser: true, 
    useUnifiedTopology: true });
 
connect.then((db) => {
    console.log("Connection OK!");
}, (err) => { console.log(err); });

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ["https://deathstar606.github.io", "http://localhost:3000", "null"];

    // Log actual value of origin to help debug
    console.log("Request received from origin:", origin);

    if (!origin || allowedOrigins.includes(origin)) {
      // Allow if origin is undefined (like curl, Postman), or matches
      console.log("✅ Allowed origin:", origin);
      callback(null, true);
    } else {
      console.log("❌ Denied origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};


var app = express();

app.use(cors(corsOptions));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

app.use('/', index);
app.use('/users', users);
app.use('/clothes', cloth);
app.use('/orders', order);

app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // log the error stack for debugging
  console.error(err.stack);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    title: 'Error', // Ensure 'title' is defined
    message: err.message,
    error: err
  });
});

const http = require('http');
const server = http.createServer(app);
server.setTimeout(10000); // 10 seconds
server.listen(process.env.PORT || 9000, () => {
  console.log('Server listening on port', process.env.PORT || 9000);
});

module.exports = app;
