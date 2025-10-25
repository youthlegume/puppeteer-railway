const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Try to import puppeteer, but don't fail if it's not available
let puppeteer;
try {
  puppeteer = require('puppeteer');
  console.log('Puppeteer loaded successfully');
} catch (error) {
  console.log('Puppeteer not available:', error.message);
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
app.use(express.json({ limit: '10mb' }));

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

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Root GET endpoint for Railway health checks
app.get('/', (req, res) => {
  console.log('Root GET endpoint called');
  res.json({ 
    status: 'OK', 
    message: 'Puppeteer PDF Generation API',
    endpoints: {
      health: '/health',
      generatePdf: '/api/generate-pdf',
      rootPdf: '/ (POST)',
      test: '/test'
    },
    timestamp: new Date().toISOString() 
  });
});

// Simple test endpoint without Puppeteer
app.get('/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ 
    status: 'OK', 
    message: 'Server is working without Puppeteer',
    timestamp: new Date().toISOString() 
  });
});

// PDF generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  let browser;
  
  try {
    // Check if puppeteer is available
    if (!puppeteer) {
      return res.status(503).json({ error: 'PDF generation service temporarily unavailable' });
    }

    // Input validation
    const { html } = req.body;
    
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'HTML content is required' });
    }
    
    // Limit HTML size to prevent memory issues (1MB limit)
    if (html.length > 1024 * 1024) {
      return res.status(400).json({ error: 'HTML content too large' });
    }

    console.log('Starting PDF generation...');
    
    // Launch browser with Railway-optimized settings
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
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
        '--disable-images',
        '--disable-javascript',
        '--disable-default-apps'
      ],
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 900 });
    
    // Set timeout for content loading
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 // 30 second timeout
    });

    // Generate PDF with your specifications
    const pdfBuffer = await page.pdf({
      width: '12in',
      height: '9in',
      printBackground: true,
      margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
    });

    // Validate PDF size (10MB limit)
    if (pdfBuffer.length > 10 * 1024 * 1024) {
      throw new Error('Generated PDF is too large');
    }

    console.log('PDF generated successfully, size:', pdfBuffer.length);

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
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

// Root endpoint for frontend compatibility
app.post('/', async (req, res) => {
  let browser;
  
  try {
    // Check if puppeteer is available
    if (!puppeteer) {
      return res.status(503).json({ error: 'PDF generation service temporarily unavailable' });
    }

    // Input validation
    const { html } = req.body;
    
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'HTML content is required' });
    }
    
    // Limit HTML size to prevent memory issues (1MB limit)
    if (html.length > 1024 * 1024) {
      return res.status(400).json({ error: 'HTML content too large' });
    }

    console.log('Starting PDF generation...');
    
    // Launch browser with Railway-optimized settings
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
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
        '--disable-images',
        '--disable-javascript',
        '--disable-default-apps'
      ],
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 900 });
    
    // Set timeout for content loading
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 // 30 second timeout
    });

    // Generate PDF with your specifications
    const pdfBuffer = await page.pdf({
      width: '12in',
      height: '9in',
      printBackground: true,
      margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
    });

    // Validate PDF size (10MB limit)
    if (pdfBuffer.length > 10 * 1024 * 1024) {
      throw new Error('Generated PDF is too large');
    }

    console.log('PDF generated successfully, size:', pdfBuffer.length);

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
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

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`PDF endpoint: http://localhost:${PORT}/api/generate-pdf`);
  console.log(`Root endpoint: http://localhost:${PORT}/`);
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
