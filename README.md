# Puppeteer PDF API for Railway

A simple Express.js API for generating PDFs from HTML using Puppeteer, optimized for Railway deployment.

## Features

- ✅ **Reliable Puppeteer on Railway** - No Chromium path issues
- ✅ **CORS configured** for your domain
- ✅ **Input validation** and size limits
- ✅ **Error handling** with proper cleanup
- ✅ **Health check endpoint**

## Local Development

```bash
npm install
npm start
```

## Railway Deployment

1. Push this code to GitHub
2. Connect Railway to your GitHub repo
3. Railway will auto-deploy
4. Get your Railway URL (e.g., `https://your-app.railway.app`)

## API Usage

```javascript
const response = await fetch('https://your-app.railway.app/api/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html: yourHtmlContent })
});

const pdfBuffer = await response.arrayBuffer();
```

## Endpoints

- `GET /health` - Health check
- `POST /api/generate-pdf` - Generate PDF from HTML
- `OPTIONS /api/generate-pdf` - CORS preflight
