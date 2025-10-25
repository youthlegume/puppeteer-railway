const fetch = require('node-fetch');

async function testCORS() {
  const testUrl = 'http://localhost:3001';
  const testOrigin = 'https://start-blush_r4_p17_weak_guppy.toddle.site';
  
  console.log('Testing CORS configuration...');
  console.log('Test URL:', testUrl);
  console.log('Test Origin:', testOrigin);
  
  try {
    // Test OPTIONS request (preflight)
    console.log('\n1. Testing OPTIONS request (preflight)...');
    const optionsResponse = await fetch(testUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': testOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('OPTIONS Status:', optionsResponse.status);
    console.log('OPTIONS Headers:', Object.fromEntries(optionsResponse.headers.entries()));
    
    // Test POST request
    console.log('\n2. Testing POST request...');
    const postResponse = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Origin': testOrigin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: '<html><body><h1>Test</h1></body></html>'
      })
    });
    
    console.log('POST Status:', postResponse.status);
    console.log('POST Headers:', Object.fromEntries(postResponse.headers.entries()));
    
    if (postResponse.ok) {
      console.log('✅ CORS test passed!');
    } else {
      console.log('❌ CORS test failed');
      const errorText = await postResponse.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testCORS();
