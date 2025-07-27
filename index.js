const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/send-email", async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `Zevar Club <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    res.send({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).send({ success: false, message: err.message });
  }
});

app.listen(3000, () => {
  console.log("Email API running on port 3000");
});
