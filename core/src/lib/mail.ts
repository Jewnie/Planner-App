import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_APP_ADDRESS,
    pass: process.env.MAIL_APP_PASSWORD,
  },
});

const mailOptions = {
  from: process.env.MAIL_APP_ADDRESS,
  to: process.env.MAIL_APP_ADDRESS,
  subject: 'Hello from Nodemailer',
  text: 'This is a test email using Gmail SMTP!',
};

transporter.sendMail(mailOptions, (err, info) => {
  if (err) {
    console.error('Error sending email:', err);
  } else {
    console.log('Email sent:', info.response);
  }
});
