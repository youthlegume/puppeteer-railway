console.log('Starting server...');
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'development');

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Express and CORS loaded');
console.log('Port:', PORT);

// Try to import puppeteer, but don't fail if it's not available
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
  'https://localhost:3001'
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS check - Origin:', origin);
    console.log('CORS check - Allowed origins:', allowedOrigins);
    
    // Allow requests with no origin (like mobile apps or curl requests)
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
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increased for large photobooks with cookies

// Railway-specific: Respond to root path immediately for health checks
app.get('/', (req, res) => {
  console.log('Railway health check on root path');
  res.status(200).end();
});


// Additional CORS debugging middleware
app.use((req, res, next) => {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    origin: req.get('Origin'),
    userAgent: req.get('User-Agent'),
    host: req.get('Host')
  });
  next();
});

// Health check endpoint - Railway specific
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).end();
});

// Additional info endpoint
app.get('/info', (req, res) => {
  console.log('Info endpoint called');
  res.status(200).json({ 
    status: 'OK', 
    message: 'Puppeteer PDF Generation API - URL + Cookies Support',
    endpoints: {
      health: '/health',
      generatePdf: '/api/generate-pdf',
      rootPdf: '/ (POST)',
      test: '/test'
    },
    methods: {
      urlMethod: 'Send { url, cookies, pdfOptions } for URL-based PDF generation',
      htmlMethod: 'Send { html, options } for HTML-based PDF generation (fallback)'
    },
    features: [
      'URL navigation with cookie authentication',
      'PDF section isolation for clean photobooks',
      'Large photobook support (50MB limit)',
      'High-resolution PDF generation',
      'Base64 image handling',
      'Font loading optimization'
    ],
    timestamp: new Date().toISOString() 
  });
});

// Simple test endpoint without Puppeteer
app.get('/test', (req, res) => {
  console.log('Test endpoint called');
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is working without Puppeteer',
    timestamp: new Date().toISOString() 
  });
});

// PDF generation endpoint - URL + Cookies method (primary)
app.post('/api/generate-pdf', async (req, res) => {
  let browser;
  
  try {
    // Check if puppeteer is available
    if (!puppeteer) {
      return res.status(503).json({ error: 'PDF generation service temporarily unavailable' });
    }

    // Input validation - support both URL and HTML methods
    const { url, cookies, pdfOptions = {}, html, options = {} } = req.body;
    
    // Determine which method to use
    const useUrlMethod = url && typeof url === 'string';
    const useHtmlMethod = html && typeof html === 'string';
    
    if (!useUrlMethod && !useHtmlMethod) {
      return res.status(400).json({ error: 'Either URL or HTML content is required' });
    }

    console.log('Starting PDF generation...', useUrlMethod ? 'URL method' : 'HTML method');
    
    // Launch browser with Railway-optimized settings for large photobooks
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--max-old-space-size=4096',  // More memory for large photobooks
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
        '--disable-default-apps'
      ],
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set viewport for photobook aspect ratio
    await page.setViewport({ width: 1280, height: 800 });
    
    if (useUrlMethod) {
      // URL Method: Set cookies for authentication/session
      if (cookies && cookies.length > 0) {
        console.log('Setting cookies for authentication...');
        await page.setCookie(...cookies);
      }
      
      // Navigate to URL and wait for full load (handles base64 images, dynamic content)
      console.log('Navigating to URL:', url);
      await page.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: 60000 // 60s timeout for large images
      });
      
      // Inject styles to isolate .pdf-section (hide everything else for clean photobook)
      await page.addStyleTag({
        content: `
          * { display: none !important; }
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .pdf-section { display: block !important; width: 100% !important; height: auto !important; }
          .pdf-section * { display: revert !important; }  /* Restore children */
        `,
      });
      
      // Wait for images/fonts to load
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000); // Brief pause for base64 image rendering
      
    } else {
      // HTML Method: Set content directly (fallback for private pages)
      console.log('Using HTML content method...');
      
      // Limit HTML size to prevent memory issues (50MB limit for large photobooks)
      if (html.length > 50 * 1024 * 1024) {
        throw new Error('HTML content too large (50MB limit)');
      }
      
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 60000 // 60 second timeout for large content
      });
    }

    // Emulate screen media type for browser-like rendering
    await page.emulateMediaType('screen');
    
    // Wait for any remaining animations or transitions
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate PDF with enhanced options for photobooks
    const pdfBuffer = await page.pdf({
      width: pdfOptions.width || options.width || '12in',
      height: pdfOptions.height || options.height || '9in',
      printBackground: true,  // Ensures images/backgrounds render fully
      preferCSSPageSize: true,  // Respects @page CSS rules
      scale: pdfOptions.scale || options.scale || 1,  // 1:1 scale for exact browser matching
      margin: pdfOptions.margin || options.margin || { top: '0in', right: '0in', bottom: '0in', left: '0in' },
      displayHeaderFooter: false,  // No header/footer for clean output
      format: pdfOptions.format || options.format || null,  // Use custom dimensions instead of standard formats
    });

    // Validate PDF size (50MB limit for large photobooks)
    if (pdfBuffer.length > 50 * 1024 * 1024) {
      throw new Error('Generated PDF is too large (50MB limit)');
    }

    console.log('PDF generated successfully, size:', pdfBuffer.length);

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    // Ensure browser is always closed
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

// Root endpoint for frontend compatibility - supports both URL and HTML methods
app.post('/', async (req, res) => {
  let browser;
  
  try {
    // Check if puppeteer is available
    if (!puppeteer) {
      return res.status(503).json({ error: 'PDF generation service temporarily unavailable' });
    }

    // Input validation - support both URL and HTML methods
    const { url, cookies, pdfOptions = {}, html, options = {} } = req.body;
    
    // Determine which method to use
    const useUrlMethod = url && typeof url === 'string';
    const useHtmlMethod = html && typeof html === 'string';
    
    if (!useUrlMethod && !useHtmlMethod) {
      return res.status(400).json({ error: 'Either URL or HTML content is required' });
    }

    console.log('Starting PDF generation...', useUrlMethod ? 'URL method' : 'HTML method');
    
    // Launch browser with Railway-optimized settings for large photobooks
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--max-old-space-size=4096',  // More memory for large photobooks
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
        '--disable-default-apps'
      ],
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set viewport for photobook aspect ratio
    await page.setViewport({ width: 1280, height: 800 });
    
    if (useUrlMethod) {
      // URL Method: Set cookies for authentication/session
      if (cookies && cookies.length > 0) {
        console.log('Setting cookies for authentication...');
        await page.setCookie(...cookies);
      }
      
      // Navigate to URL and wait for full load (handles base64 images, dynamic content)
      console.log('Navigating to URL:', url);
      await page.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: 60000 // 60s timeout for large images
      });
      
      // Inject styles to isolate .pdf-section (hide everything else for clean photobook)
      await page.addStyleTag({
        content: `
          * { display: none !important; }
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .pdf-section { display: block !important; width: 100% !important; height: auto !important; }
          .pdf-section * { display: revert !important; }  /* Restore children */
        `,
      });
      
      // Wait for images/fonts to load
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000); // Brief pause for base64 image rendering
      
    } else {
      // HTML Method: Set content directly (fallback for private pages)
      console.log('Using HTML content method...');
      
      // Limit HTML size to prevent memory issues (50MB limit for large photobooks)
      if (html.length > 50 * 1024 * 1024) {
        throw new Error('HTML content too large (50MB limit)');
      }
      
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 60000 // 60 second timeout for large content
      });
    }

    // Emulate screen media type for browser-like rendering
    await page.emulateMediaType('screen');
    
    // Wait for any remaining animations or transitions
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate PDF with enhanced options for photobooks
    const pdfBuffer = await page.pdf({
      width: pdfOptions.width || options.width || '12in',
      height: pdfOptions.height || options.height || '9in',
      printBackground: true,  // Ensures images/backgrounds render fully
      preferCSSPageSize: true,  // Respects @page CSS rules
      scale: pdfOptions.scale || options.scale || 1,  // 1:1 scale for exact browser matching
      margin: pdfOptions.margin || options.margin || { top: '0in', right: '0in', bottom: '0in', left: '0in' },
      displayHeaderFooter: false,  // No header/footer for clean output
      format: pdfOptions.format || options.format || null,  // Use custom dimensions instead of standard formats
    });

    // Validate PDF size (50MB limit for large photobooks)
    if (pdfBuffer.length > 50 * 1024 * 1024) {
      throw new Error('Generated PDF is too large (50MB limit)');
    }

    console.log('PDF generated successfully, size:', pdfBuffer.length);

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    // Ensure browser is always closed
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


// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Catch-all route for debugging
app.use('*', (req, res) => {
  console.log('Catch-all route hit:', req.method, req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    url: req.originalUrl,
    availableRoutes: ['/health', '/api/generate-pdf', '/ (POST)']
  });
});

// Start server - BIND TO 0.0.0.0 FOR RAILWAY/DOCKER
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`PDF endpoint: http://0.0.0.0:${PORT}/api/generate-pdf`);
  console.log(`Root endpoint: http://0.0.0.0:${PORT}/`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server address: ${server.address()}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
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
