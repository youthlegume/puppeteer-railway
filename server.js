console.log('Starting server...');
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'development');

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Express and CORS loaded');
console.log('Port:', PORT);

// Try to import puppeteer
let puppeteer;
try {
  puppeteer = require('puppeteer');
  console.log('Puppeteer loaded successfully');
} catch (error) {
  console.log('Puppeteer not available:', error.message);
  console.log('Server will run without PDF generation capability');
}

// CORS configuration
const allowedOrigins = [
  'https://start-blush_r4_p17_weak_guppy.toddle.site',
  'https://unique-expectations-147008.framer.app', // Updated for Framer
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://localhost:3001',
];

const corsOptions = {
  origin: (origin, callback) => {
    console.log('CORS check - Origin:', origin);
    console.log('CORS check - Allowed origins:', allowedOrigins);
    if (!origin) {
      console.log('CORS check - Allowing request with no origin');
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      console.log('CORS check - Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('CORS check - Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Adjustable for large photobooks

// Health check
app.get('/', (req, res) => {
  console.log('Railway health check on root path');
  res.status(200).end();
});

app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).end();
});

app.get('/info', (req, res) => {
  console.log('Info endpoint called');
  res.status(200).json({
    status: 'OK',
    message: 'Puppeteer PDF Generation API - HTML + Cookies Support',
    endpoints: { health: '/health', generatePdf: '/api/generate-pdf' },
    methods: {
      htmlMethod: 'Send { html, cookies, pdfOptions } for HTML-based PDF generation',
    },
    features: [
      'HTML rendering with cookie authentication',
      'PDF section isolation for clean photobooks',
      'Custom 1200x900px size support',
      'High-resolution PDF generation',
      'Base64 image handling',
    ],
    timestamp: new Date().toISOString(),
  });
});

app.get('/test', (req, res) => {
  console.log('Test endpoint called');
  res.status(200).json({
    status: 'OK',
    message: 'Server is working without Puppeteer',
    timestamp: new Date().toISOString(),
  });
});

// PDF generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  let browser;
  try {
    if (!puppeteer) {
      return res.status(503).json({ error: 'PDF generation service temporarily unavailable' });
    }

    const { html, cookies, pdfOptions = {}, url, options = {} } = req.body;
    const useHtmlMethod = html && typeof html === 'string';

    if (!useHtmlMethod) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    console.log('Starting PDF generation with HTML method');
    console.log('Received payload:', { htmlLength: html.length, cookiesLength: cookies ? cookies.length : 0, pdfOptions });

    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--max-old-space-size=4096',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
      ],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 }); // Match Framer's 1200x900px

    if (cookies && Array.isArray(cookies) && cookies.length > 0) {
      console.log('Cookies to set:', JSON.stringify(cookies, null, 2));
      try {
        await page.setCookie(
          ...cookies.map(cookie => ({
            ...cookie,
            value: String(cookie.value || ''),
          })),
        );
        console.log('Cookies set successfully');
      } catch (cookieError) {
        console.error('Cookie setting error:', cookieError.message);
        console.log('Proceeding without cookies due to error');
      }
    } else {
      console.log('No cookies provided or invalid cookie array');
    }

    if (html.length > 50 * 1024 * 1024) {
      throw new Error('HTML content too large (50MB limit)');
    }
    console.log('Setting content with HTML length:', html.length);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    await page.emulateMediaType('screen');
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for rendering

    const pdfBuffer = await page.pdf({
      width: pdfOptions.width || options.width || '1200px',
      height: pdfOptions.height || options.height || '900px',
      printBackground: true,
      preferCSSPageSize: true,
      scale: pdfOptions.scale || options.scale || 1, // Default to 1 to avoid oversized elements
      margin: pdfOptions.margin || options.margin || { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      displayHeaderFooter: false,
    });

    if (pdfBuffer.length > 50 * 1024 * 1024) {
      throw new Error('Generated PDF is too large (50MB limit)');
    }

    console.log('PDF generated successfully, size:', pdfBuffer.length);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed successfully');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Catch-all route
app.use('*', (req, res) => {
  console.log('Catch-all route hit:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    availableRoutes: ['/health', '/api/generate-pdf'],
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`PDF endpoint: http://0.0.0.0:${PORT}/api/generate-pdf`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server address: ${server.address()}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});