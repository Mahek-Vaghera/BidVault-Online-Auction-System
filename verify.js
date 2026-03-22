#!/usr/bin/env node

/**
 * BidVault System Verification Script
 * 
 * Run this to check if all services are properly configured
 * Usage: node verify.js
 */

const http = require('http');
const net = require('net');

console.log('🔍 BidVault System Verification\n');
console.log('='.repeat(50));

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Check if port is in use
function checkPort(port, name) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        results.passed.push(`${name} is running on port ${port}`);
        resolve(true);
      } else {
        results.failed.push(`${name} check failed: ${err.message}`);
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      results.failed.push(`${name} is NOT running (port ${port} is free)`);
      resolve(false);
    });

    server.listen(port);
  });
}

// Check HTTP endpoint
function checkHTTP(url, name) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      if (res.statusCode === 200 || res.statusCode === 304) {
        results.passed.push(`${name} is responding (${res.statusCode})`);
        resolve(true);
      } else {
        results.warnings.push(`${name} responded with status ${res.statusCode}`);
        resolve(false);
      }
    }).on('error', (err) => {
      results.failed.push(`${name} connection failed: ${err.message}`);
      resolve(false);
    });
  });
}

// Check if file exists
function checkFile(path, name) {
  const fs = require('fs');
  if (fs.existsSync(path)) {
    results.passed.push(`${name} exists`);
    return true;
  } else {
    results.failed.push(`${name} is missing`);
    return false;
  }
}

async function runChecks() {
  console.log('\n📦 Checking Services...\n');

  // Check MongoDB (27017)
  await checkPort(27017, 'MongoDB');

  // Check Redis (6379)
  await checkPort(6379, 'Redis');

  // Check Backend (5000)
  await checkPort(5000, 'Backend Server');

  // Check Frontend (3000)
  await checkPort(3000, 'Frontend Dev Server');

  console.log('\n🌐 Checking HTTP Endpoints...\n');

  // Check backend API
  await checkHTTP('http://localhost:5000', 'Backend API');

  // Check frontend
  await checkHTTP('http://localhost:3000', 'Frontend App');

  console.log('\n📄 Checking Configuration Files...\n');

  // Check backend .env
  checkFile('./backend/.env', 'Backend .env');

  // Check frontend .env
  checkFile('./frontend/.env', 'Frontend .env');

  // Check package.json files
  checkFile('./backend/package.json', 'Backend package.json');
  checkFile('./frontend/package.json', 'Frontend package.json');

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Results Summary:\n');

  if (results.passed.length > 0) {
    console.log(`${colors.green}✅ PASSED (${results.passed.length}):${colors.reset}`);
    results.passed.forEach(msg => console.log(`   ${colors.green}✓${colors.reset} ${msg}`));
  }

  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️  WARNINGS (${results.warnings.length}):${colors.reset}`);
    results.warnings.forEach(msg => console.log(`   ${colors.yellow}!${colors.reset} ${msg}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n${colors.red}❌ FAILED (${results.failed.length}):${colors.reset}`);
    results.failed.forEach(msg => console.log(`   ${colors.red}✗${colors.reset} ${msg}`));
  }

  console.log('\n' + '='.repeat(50));

  // Provide recommendations
  console.log('\n💡 Recommendations:\n');

  if (results.failed.some(f => f.includes('MongoDB'))) {
    console.log('   • Start MongoDB: mongod');
  }

  if (results.failed.some(f => f.includes('Redis'))) {
    console.log('   • Start Redis: redis-server');
  }

  if (results.failed.some(f => f.includes('Backend'))) {
    console.log('   • Start Backend: cd backend && npm run dev');
  }

  if (results.failed.some(f => f.includes('Frontend'))) {
    console.log('   • Start Frontend: cd frontend && npm run dev');
  }

  if (results.failed.some(f => f.includes('.env'))) {
    console.log('   • Copy .env.example to .env and configure');
  }

  console.log('\n📚 For detailed instructions, see: STARTUP_GUIDE.md\n');

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run all checks
runChecks().catch(err => {
  console.error(`${colors.red}Error running checks:${colors.reset}`, err);
  process.exit(1);
});