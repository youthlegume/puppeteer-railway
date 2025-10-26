// server.js

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Setup ---
const allowedOrigins = [
  'https://start-blush_r4_p17_weak_guppy.toddle.site',
  'https://unique-expectations-147008.framer.app',
  'http://localhost:3000',
  'http://localhost:3001'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '50mb' }));

// --- Health Checks ---
app.get('/', (req, res) => res.sendStatus(200));
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// --- PDF API ---
app.post('/api/generate-pdf', async (req, res) => {
  const { html, pdfOptions = {} } = req.body;
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing HTML content' });
  }

  // 1. Save the ENTIRE html document to disk for inspection (optional but robust)
  require('fs').writeFileSync('debug-sent-to-puppeteer.html', html);
  // 2. Log key portions for quick inspection
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  const headContent = headMatch ? headMatch[1] : '<NO HEAD FOUND>';
  console.log('--- HTML <head> content sent to Puppeteer:');
  console.log(headContent);
  const linkAndStyleTags = (headContent.match(/<(link|style)[\s\S]*?>[\s\S]*?<\/style>?/gi) || []).join('\n');
  console.log('--- All <link> and <style> tags in head:');
  console.log(linkAndStyleTags);
  // Log top-level summary for auditing
  console.log('HTML length:', html.length);

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      headless: true,
    });

    const page = await browser.newPage();

    // Adjust viewport from options or use 1200x900 default (Framer layout)
    const width = pdfOptions.width ? parseInt(pdfOptions.width) : 1200;
    const height = pdfOptions.height ? parseInt(pdfOptions.height) : 900;
    await page.setViewport({ width, height });

    // Debug: uncomment to check received HTML content
    // require('fs').writeFileSync('debug.html', html);

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for your main export section and for all fonts to load
    await page.waitForSelector('.pdf-export', { timeout: 7000 });
    await page.evaluateHandle('document.fonts.ready');

    // Optional: wait a moment for animations or images
    // await page.waitForTimeout(400);

    const buffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      scale: pdfOptions.scale || 1,
      margin: pdfOptions.margin || { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      ...pdfOptions,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

    console.log('PDF generated successfully:', buffer.length, 'bytes');
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// --- Start Server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Health: http://0.0.0.0:${PORT}/health`);
  console.log(`PDF API: http://0.0.0.0:${PORT}/api/generate-pdf`);
});
