const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // allow larger payloads

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
      attachments: attachments || []  // enable base64 PDF support
    };

    await transporter.sendMail(mailOptions);

    res.send({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).send({ success: false, message: err.message });
  }
});

app.listen(3000, () => {
  console.log("Email API running on port 3000");
});
const fs = require("fs");
const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");

app.post("/upload-invoice", async (req, res) => {
  try {
    const { base64, filename } = req.body;

    // Save PDF temporarily
    const buffer = Buffer.from(base64, "base64");
    const tempPath = `/tmp/${filename}`;
    fs.writeFileSync(tempPath, buffer);

    // 🔐 Use service account from Render ENV
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    const fileMetadata = {
      name: filename,
      // parents: ["optional_folder_id_here"], // if using a specific Drive folder
    };

    const media = {
      mimeType: "application/pdf",
      body: fs.createReadStream(tempPath),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id",
    });

    const fileId = file.data.id;

    // 📂 Make file public
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
    });

    res.json({ link: data.webViewLink });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});
