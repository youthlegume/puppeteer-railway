const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: [
    'https://start-blush_r4_p17_weak_guppy.toddle.site',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

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

// Handle OPTIONS requests for CORS
app.options('/api/generate-pdf', (req, res) => {
  res.status(200).end();
});

// Handle OPTIONS requests for root endpoint
app.options('/', (req, res) => {
  res.status(200).end();
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`PDF endpoint: http://localhost:${PORT}/api/generate-pdf`);
  console.log(`Root endpoint: http://localhost:${PORT}/`);
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
