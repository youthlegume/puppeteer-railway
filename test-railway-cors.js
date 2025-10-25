// Use built-in fetch (Node.js 18+) or require node-fetch for older versions
let fetch;
try {
  fetch = globalThis.fetch;
} catch (error) {
  fetch = require('node-fetch');
}

async function testRailwayCORS() {
  const railwayUrl = 'https://puppeteer-railway-production-102f.up.railway.app';
  const testOrigin = 'https://start-blush_r4_p17_weak_guppy.toddle.site';
  
  console.log('Testing Railway CORS configuration...');
  console.log('Railway URL:', railwayUrl);
  console.log('Test Origin:', testOrigin);
  
  try {
    // Test OPTIONS request (preflight)
    console.log('\n1. Testing OPTIONS request (preflight)...');
    const optionsResponse = await fetch(railwayUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': testOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('OPTIONS Status:', optionsResponse.status);
    console.log('OPTIONS Headers:', Object.fromEntries(optionsResponse.headers.entries()));
    
    // Check if CORS headers are present
    const corsHeaders = {
      'access-control-allow-origin': optionsResponse.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': optionsResponse.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': optionsResponse.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': optionsResponse.headers.get('access-control-allow-credentials')
    };
    
    console.log('CORS Headers:', corsHeaders);
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log('✅ CORS headers are present on Railway');
    } else {
      console.log('❌ CORS headers are missing on Railway - deployment issue');
    }
    
    // Test POST request
    console.log('\n2. Testing POST request...');
    const postResponse = await fetch(railwayUrl, {
      method: 'POST',
      headers: {
        'Origin': testOrigin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: '<html><body><h1>Test PDF</h1></body></html>'
      })
    });
    
    console.log('POST Status:', postResponse.status);
    console.log('POST Headers:', Object.fromEntries(postResponse.headers.entries()));
    
    if (postResponse.ok) {
      console.log('✅ Railway CORS test passed!');
    } else {
      console.log('❌ Railway CORS test failed');
      const errorText = await postResponse.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testRailwayCORS();
