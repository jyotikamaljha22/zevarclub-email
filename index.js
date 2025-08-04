const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs");
const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 📨 Send Email Endpoint
app.post("/send-email", async (req, res) => {
  const { to, subject, html, attachments } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `Zevar Club <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments: attachments || [],
    };

    await transporter.sendMail(mailOptions);
    res.send({ success: true });
  } catch (err) {
    console.error("❌ Email send error:", err);
    res.status(500).send({ success: false, message: err.message });
  }
});

// 📤 Upload PDF to Google Drive
app.post("/upload-invoice", async (req, res) => {
  try {
    const { base64, filename } = req.body;

    const buffer = Buffer.from(base64, "base64");
    const tempPath = `/tmp/${filename}`;
    fs.writeFileSync(tempPath, buffer);

    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

    const oAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      "http://localhost" // Still works even on backend
    );

    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    const fileMetadata = {
      name: filename,
      parents: ["11H1qxfh6llgAYCaOZvfuJSCeJxZdnrWm"], // your Drive folder ID
    };

    const media = {
      mimeType: "application/pdf",
      body: fs.createReadStream(tempPath),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id",
      supportsAllDrives: true,
    });

    const fileId = file.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const { data } = await drive.files.get({
      fileId,
      fields: "webViewLink",
      supportsAllDrives: true,
    });

    res.json({ link: data.webViewLink });
  } catch (err) {
    console.error("❌ Upload failed:", err.message || err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

app.listen(3000, () => {
  console.log("🚀 ZevarClub Email + Drive Upload API running on port 3000");
});
