const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Config - could be from .env or command line args
const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || '8000';
const API_PROTOCOL = process.env.API_PROTOCOL || 'http';
const API_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}`;

const endpoints = [
  '/',
  '/login/',
  '/token/refresh/'
];

console.log('=== Nexus Academy Backend Server Connectivity Check ===');
console.log(`Testing connection to: ${API_URL}`);
console.log('---------------------------------------------------');

// Check if server is reachable
const checkServerReachable = () => {
  return new Promise((resolve) => {
    const parsedUrl = url.parse(API_URL);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    }, (res) => {
      resolve({
        reachable: true,
        statusCode: res.statusCode,
        headers: res.headers
      });
    });
    
    req.on('error', (error) => {
      resolve({
        reachable: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        reachable: false,
        error: 'Connection timed out'
      });
    });
    
    req.end();
  });
};

// Check if specific endpoints exist
const checkEndpoint = (endpoint) => {
  return new Promise((resolve) => {
    const parsedUrl = url.parse(`${API_URL}${endpoint}`);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: 'OPTIONS',
      timeout: 5000
    }, (res) => {
      resolve({
        exists: res.statusCode < 400,
        statusCode: res.statusCode,
        headers: res.headers
      });
    });
    
    req.on('error', (error) => {
      resolve({
        exists: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        exists: false,
        error: 'Connection timed out'
      });
    });
    
    req.end();
  });
};

// Check CORS configuration
const checkCors = () => {
  return new Promise((resolve) => {
    const parsedUrl = url.parse(`${API_URL}/login/`);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      },
      timeout: 5000
    }, (res) => {
      const corsHeaders = {
        'access-control-allow-origin': res.headers['access-control-allow-origin'],
        'access-control-allow-methods': res.headers['access-control-allow-methods'],
        'access-control-allow-headers': res.headers['access-control-allow-headers'],
        'access-control-allow-credentials': res.headers['access-control-allow-credentials']
      };
      
      const corsConfigured = !!res.headers['access-control-allow-origin'];
      
      resolve({
        corsConfigured,
        statusCode: res.statusCode,
        corsHeaders
      });
    });
    
    req.on('error', (error) => {
      resolve({
        corsConfigured: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        corsConfigured: false,
        error: 'Connection timed out'
      });
    });
    
    req.end();
  });
};

// Run all checks
const runChecks = async () => {
  // Check if server is reachable
  const serverStatus = await checkServerReachable();
  console.log('Server reachability:');
  if (serverStatus.reachable) {
    console.log(`✅ Server is reachable! Status code: ${serverStatus.statusCode}`);
  } else {
    console.log(`❌ Server is NOT reachable: ${serverStatus.error}`);
    console.log('Possible issues:');
    console.log('  - Backend server is not running');
    console.log('  - Incorrect hostname or port');
    console.log('  - Firewall blocking connection');
    console.log('\nFurther endpoint checks will likely fail.\n');
  }
  
  console.log('---------------------------------------------------');
  
  // Check endpoints
  console.log('API Endpoints:');
  for (const endpoint of endpoints) {
    const endpointStatus = await checkEndpoint(endpoint);
    if (endpointStatus.exists) {
      console.log(`✅ ${endpoint} - Available (${endpointStatus.statusCode})`);
    } else {
      console.log(`❌ ${endpoint} - Not available${endpointStatus.error ? `: ${endpointStatus.error}` : ''}`);
    }
  }
  
  console.log('---------------------------------------------------');
  
  // Check CORS
  const corsStatus = await checkCors();
  console.log('CORS Configuration:');
  if (corsStatus.corsConfigured) {
    console.log('✅ CORS appears to be configured');
    console.log('  Headers:');
    for (const [header, value] of Object.entries(corsStatus.corsHeaders)) {
      if (value) console.log(`  - ${header}: ${value}`);
    }
    
    // Check if localhost:3000 is in allowed origins
    const allowedOrigins = corsStatus.corsHeaders['access-control-allow-origin'];
    if (allowedOrigins === '*') {
      console.log('✅ All origins are allowed');
    } else if (allowedOrigins && allowedOrigins.includes('localhost:3000')) {
      console.log('✅ localhost:3000 is in allowed origins');
    } else {
      console.log('❌ localhost:3000 is NOT in allowed origins');
      console.log('  This could cause CORS issues for the frontend');
    }
  } else {
    console.log(`❌ CORS does not appear to be configured${corsStatus.error ? `: ${corsStatus.error}` : ''}`);
    console.log('  This will cause issues for the frontend making requests to the backend');
  }
  
  console.log('---------------------------------------------------');
  console.log('Recommendations:');
  
  if (!serverStatus.reachable) {
    console.log('1. Make sure the Django backend server is running:');
    console.log('   - Run: python manage.py runserver 0.0.0.0:8000');
  }
  
  if (serverStatus.reachable && 
      endpoints.some(async (e) => !(await checkEndpoint(e)).exists)) {
    console.log('1. Check Django URL patterns in urls.py files');
    console.log('   - Ensure the login endpoint is defined');
  }
  
  if (!corsStatus.corsConfigured) {
    console.log('1. Configure CORS in your Django settings.py:');
    console.log('   - Ensure django-cors-headers is installed');
    console.log('   - Add corsheaders to INSTALLED_APPS');
    console.log('   - Add corsheaders.middleware.CorsMiddleware to MIDDLEWARE');
    console.log('   - Set CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]');
  }
  
  console.log('\n2. Check the API_BASE_URL in the React frontend:');
  console.log('   - Create a .env file with REACT_APP_API_BASE_URL=http://localhost:8000');
  
  console.log('\n3. Restart both frontend and backend servers after making changes');
};

runChecks().catch(error => {
  console.error('Error running checks:', error);
}); 