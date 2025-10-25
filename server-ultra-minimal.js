const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting ultra-minimal server...');
console.log('Port:', PORT);

// Ultra-simple CORS
app.use(cors());

// Debug middleware to see all requests
app.use((req, res, next) => {
  console.log(`=== REQUEST: ${req.method} ${req.url} from ${req.ip} at ${new Date().toISOString()} ===`);
  console.log('User-Agent:', req.get('User-Agent'));
  console.log('Origin:', req.get('Origin'));
  next();
});

// Root endpoint - Railway health check
app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.status(200).end();
});

// Health endpoint - Railway specific format
app.get('/health', (req, res) => {
  console.log('Health endpoint hit');
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ status: 'OK', test: 'working' });
});

// Start server - BIND TO 0.0.0.0 FOR RAILWAY/DOCKER
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ultra-minimal server running on http://0.0.0.0:${PORT}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

// Keep the app alive for Railway - VERY AGGRESSIVE
setInterval(() => {
  console.log('Keeping alive at', new Date().toISOString());
}, 2000); // Log every 2 seconds

// Also add immediate activity
console.log('Server started, beginning keep-alive immediately');

console.log('Ultra-minimal server setup complete');
