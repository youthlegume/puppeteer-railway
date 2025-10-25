console.log('=== DEBUG SERVER STARTING ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port from env:', process.env.PORT);
console.log('All env vars:', Object.keys(process.env));

const express = require('express');
console.log('Express loaded successfully');

const cors = require('cors');
console.log('CORS loaded successfully');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('=== SERVER CONFIGURATION ===');
console.log('Port:', PORT);
console.log('Express app created');

// Ultra-simple setup
app.use(cors());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log('=== REQUEST RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('=== ROOT ENDPOINT HIT ===');
  res.json({ 
    status: 'OK', 
    message: 'Debug server is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    nodeVersion: process.version
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  console.log('=== HEALTH ENDPOINT HIT ===');
  res.json({ 
    status: 'OK', 
    health: 'good',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('=== EXPRESS ERROR ===');
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
console.log('=== STARTING SERVER ===');
const server = app.listen(PORT, () => {
  console.log('=== SERVER STARTED SUCCESSFULLY ===');
  console.log(`Server running on port ${PORT}`);
  console.log(`Server address:`, server.address());
});

server.on('error', (error) => {
  console.error('=== SERVER ERROR ===');
  console.error('Error:', error);
});

console.log('=== DEBUG SERVER SETUP COMPLETE ===');
