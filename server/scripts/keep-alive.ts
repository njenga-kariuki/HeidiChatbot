import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const PING_INTERVAL = 60 * 1000; // Ping every 1 minute
const HEALTH_FILE = path.join(process.cwd(), 'health.txt');
let isRunning = true;

// Write initial health status
fs.writeFileSync(HEALTH_FILE, new Date().toISOString());

async function pingHealth(): Promise<void> {
  try {
    const port = process.env.PORT || 5000;
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    if (response.ok) {
      // Update health file timestamp
      fs.writeFileSync(HEALTH_FILE, new Date().toISOString());
      console.log(`[${new Date().toISOString()}] Health check successful`);
    } else {
      console.error(`Health check failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('Health check error:', error);
  }
}

// Start monitoring loop
async function startMonitoring() {
  while (isRunning) {
    await pingHealth();
    await new Promise(resolve => setTimeout(resolve, PING_INTERVAL));
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  isRunning = false;
  console.log('Shutting down health monitor...');
});

process.on('SIGTERM', () => {
  isRunning = false;
  console.log('Shutting down health monitor...');
});

startMonitoring().catch(console.error);