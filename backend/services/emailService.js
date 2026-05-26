const nodemailer = require("nodemailer");

const sendOtpEmail = async (email, otpCode) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Forensic Timeline" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Forensic Timeline Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Email Verification</h2>
        <p>Your OTP verification code is:</p>
        <h1 style="letter-spacing: 4px;">${otpCode}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendOtpEmail,
};