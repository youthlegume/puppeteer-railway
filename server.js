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
    message: 'Puppeteer PDF Generation API - URL + Cookies Support',
    endpoints: { health: '/health', generatePdf: '/api/generate-pdf' },
    methods: {
      urlMethod: 'Send { url, cookies, pdfOptions } for URL-based PDF generation',
      htmlMethod: 'Send { html, options } for HTML-based PDF generation (fallback)',
    },
    features: [
      'URL navigation with cookie authentication',
      'PDF section isolation for clean photobooks',
      'Large photobook support (50MB limit)',
      'High-resolution PDF generation',
      'Base64 image handling',
      'Font loading optimization',
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

    const { url, cookies, pdfOptions = {}, html, options = {} } = req.body;
    const useUrlMethod = url && typeof url === 'string';
    const useHtmlMethod = html && typeof html === 'string';

    if (!useUrlMethod && !useHtmlMethod) {
      return res.status(400).json({ error: 'Either URL or HTML content is required' });
    }

    console.log('Starting PDF generation...', useUrlMethod ? 'URL method' : 'HTML method');
    console.log('Received payload:', { url, cookiesLength: cookies ? cookies.length : 0, pdfOptions });

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
    await page.setViewport({ width: 1920, height: 1080 }); // Larger viewport for full content

    if (useUrlMethod) {
      if (cookies && Array.isArray(cookies) && cookies.length > 0) {
        console.log('Cookies to set:', JSON.stringify(cookies, null, 2));
        try {
          await page.setCookie(
            ...cookies.map(cookie => ({
              ...cookie,
              url,
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

      console.log('Navigating to URL:', url);
      await page.goto(url, { waitUntil: 'load', timeout: 60000 }); // Changed to 'load' for initial render

      // Execute page JavaScript to ensure hydration
      await page.evaluate(() => {
        window.dispatchEvent(new Event('load')); // Trigger load event if needed
        return new Promise(resolve => setTimeout(resolve, 500)); // Allow time for JS
      });

      // Debug: Log initial page content
      const pageContent = await page.content();
      console.log('Page content loaded:', pageContent.substring(0, 500) + '...');

      // Inject styles to isolate .pdf-section with fallback
      await page.addStyleTag({
        content: `
          * { display: none !important; }
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
            min-height: 100vh !important; 
          }
          .pdf-section, .pdf-section * { 
            display: block !important; 
            width: 100% !important; 
            height: auto !important; 
            position: relative !important; 
          }
          /* Fallback: Show all if .pdf-section not found */
          @media print {
            .pdf-section:empty ~ * { display: block !important; }
          }
        `,
      });
      console.log('Styles injected to isolate .pdf-section');

      // Wait for fonts
      await page.evaluate(() => document.fonts.ready);
      console.log('Fonts ready');

      // Wait for .pdf-section elements and images
      await page.waitForFunction(() => {
        const sections = document.querySelectorAll('.pdf-section');
        if (sections.length === 0) return false;
        return Array.from(sections).every(section => {
          const images = section.querySelectorAll('img, [style*="background-image"]');
          return Array.from(images).every(img => {
            const style = window.getComputedStyle(img);
            return img.complete && (img.naturalHeight > 0 || style.backgroundImage !== 'none');
          });
        });
      }, { timeout: 120000 }); // Increased to 120 seconds
      console.log('PDF sections and images loaded');

      // Debug: Log content after styles
      const postStyleContent = await page.content();
      console.log('Content after styles:', postStyleContent.substring(0, 500) + '...');
    } else {
      if (html.length > 50 * 1024 * 1024) {
        throw new Error('HTML content too large (50MB limit)');
      }
      console.log('Using HTML content method...');
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    }

    await page.emulateMediaType('screen');
    await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause for transitions

    const pdfBuffer = await page.pdf({
      width: pdfOptions.width || options.width || '12in',
      height: pdfOptions.height || options.height || '9in',
      printBackground: true,
      preferCSSPageSize: true,
      scale: pdfOptions.scale || options.scale || 2, // Default to 2 for high resolution
      margin: pdfOptions.margin || options.margin || { top: '0in', right: '0in', bottom: '0in', left: '0in' },
      displayHeaderFooter: false,
      format: pdfOptions.format || options.format || null,
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