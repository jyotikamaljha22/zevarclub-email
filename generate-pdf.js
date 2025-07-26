// generate-pdf.js
const express = require('express');
const puppeteer = require('puppeteer');

const router = express.Router();

router.post('/generate-pdf', async (req, res) => {
  const { html, filename = 'invoice.pdf' } = req.body;

  if (!html) return res.status(400).json({ error: 'Missing HTML content' });

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(buffer);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

module.exports = router;
