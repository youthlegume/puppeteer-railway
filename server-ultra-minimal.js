const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting ultra-minimal server...');
console.log('Port:', PORT);

// Ultra-simple CORS
app.use(cors());

// Root endpoint - Railway health check
app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.json({ status: 'OK', message: 'Server is running' });
});

// Health endpoint
app.get('/health', (req, res) => {
  console.log('Health endpoint hit');
  res.json({ status: 'OK', health: 'good' });
});

// Test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ status: 'OK', test: 'working' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Ultra-minimal server running on port ${PORT}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

console.log('Ultra-minimal server setup complete');
