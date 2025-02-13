import fetch from 'node-fetch';

const PING_INTERVAL = 5 * 60 * 1000; // Ping every 1 minute instead of 5
const MAX_RETRIES = 5;
const MAX_RESTARTS = 3;
const RETRY_DELAY = 2000; // 2 seconds
let restartCount = 0;

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
  const baseUrl = `http://0.0.0.0:${port}`;

  console.log('[Keep-alive] Starting monitoring system');
  console.log('[Keep-alive] Memory usage:', process.memoryUsage());
  const url = `${baseUrl}/health`;

  console.log(`Starting keep-alive monitor for ${url}`);

  // Initial ping
  await pingWithRetry(url);

  // More frequent pings
  intervalId = setInterval(() => pingWithRetry(url), PING_INTERVAL);
}

function restartMonitoring() {
  if (restartCount >= MAX_RESTARTS) {
    console.error('[Keep-alive] Maximum restart attempts reached. Manual intervention required.');
    return;
  }
  console.log('[Keep-alive] Restarting monitoring... Attempt:', ++restartCount);
  clearInterval(intervalId);
  startMonitoring().catch(console.error);
}

// Start monitoring and handle any errors
startMonitoring().catch(error => {
  console.error('Failed to start monitoring:', error);
  // Don't exit, restart the monitoring
  setTimeout(() => restartMonitoring(), 5000);
});