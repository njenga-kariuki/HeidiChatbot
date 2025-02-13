
import fetch from 'node-fetch';

const PING_INTERVAL = 5* 60 * 1000; // Ping every 1 minute instead of 5
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

let intervalId: NodeJS.Timeout;
let isShuttingDown = false;

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Continuing to run...');
  // Don't exit, keep running
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal. Continuing to run...');
  // Don't exit, keep running
});

async function pingWithRetry(url: string, retries = 0): Promise<void> {
  if (isShuttingDown) return;
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`[${new Date().toISOString()}] Keep-alive successful: ${response.status}`);
    } else {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Keep-alive attempt ${retries + 1} failed:`, error);
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      await pingWithRetry(url, retries + 1);
    }
  }
}

async function startMonitoring() {
  const port = process.env.PORT || 5000;
  const url = `http://0.0.0.0:${port}/health`;
  
  console.log(`Starting keep-alive monitor for ${url}`);
  
  // Initial ping
  await pingWithRetry(url);
  
  // More frequent pings
  intervalId = setInterval(() => pingWithRetry(url), PING_INTERVAL);
}

// Start monitoring and handle any errors
startMonitoring().catch(error => {
  console.error('Failed to start monitoring:', error);
  // Don't exit, restart the monitoring
  setTimeout(() => startMonitoring(), 5000);
});
