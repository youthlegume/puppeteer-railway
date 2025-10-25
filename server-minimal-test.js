const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting minimal test server...');
console.log('Port:', PORT);
console.log('Node version:', process.version);

// Simple CORS configuration
const corsOptions = {
  origin: true, // Allow all origins for testing
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Simple test endpoint
app.get('/', (req, res) => {
  console.log('GET / received');
  res.json({ 
    status: 'OK', 
    message: 'Minimal test server working',
    timestamp: new Date().toISOString()
  });
});

app.post('/', (req, res) => {
  console.log('POST / received');
  res.json({ 
    status: 'OK', 
    message: 'POST endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  console.log('Health check received');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Minimal test server running on port ${PORT}`);
  console.log(`Server address:`, server.address());
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

console.log('Server setup complete');
