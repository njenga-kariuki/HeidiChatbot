
import fetch from 'node-fetch';

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function pingWithRetry(url: string, retries = 0): Promise<void> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`[${new Date().toISOString()}] Health check successful: ${response.status}`);
    } else {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Health check attempt ${retries + 1} failed:`, error);
    if (retries < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      await pingWithRetry(url, retries + 1);
    }
  }
}

async function startMonitoring() {
  const port = process.env.PORT || 5000;
  const url = `http://0.0.0.0:${port}/health`;
  
  console.log(`Starting health check monitor for ${url}`);
  
  // Initial ping
  await pingWithRetry(url);
  
  // Schedule regular pings
  setInterval(() => pingWithRetry(url), PING_INTERVAL);
}

startMonitoring().catch(error => {
  console.error('Failed to start monitoring:', error);
  process.exit(1);
});
