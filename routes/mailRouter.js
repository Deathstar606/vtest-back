const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const mailRouter = express.Router();

mailRouter.use(bodyParser.json());

mailRouter.post('/', async (req, res) => {
  const { subject, htmlContent, email, message } = req.body;
  console.log('Received email request:', { subject, email, message }); // Debug log
  
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use `true` for port 465
    auth: {
      user: "velourabd.online@gmail.com",
      pass: "rgwm yekr gypa qtdq",
    },
  });

  const mailOptionsUser = {
    from: 'velourabd.online@gmail.com', // sender address
    to: email, // recipient
    subject: subject,
    html: htmlContent
  };

  const mailOptionsAdmin = {
    from: email, // sender is the user
    to: 'velourabd.online@gmail.com', // admin email
    subject: 'An Order Has Been Made',
    text: message
  };

  try {
    await transporter.sendMail(mailOptionsUser);
    console.log('Newsletter sent successfully');
    
    await transporter.sendMail(mailOptionsAdmin);
    console.log('Message to admin sent successfully');
    
    res.status(200).send('Emails sent successfully');
  } catch (error) {
    console.error('Failed to send emails:', error);
    res.status(500).send('Failed to send emails');
  }
});

module.exports = mailRouter;