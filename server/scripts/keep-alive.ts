
import fetch from 'node-fetch';

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const APP_URL = process.env.REPL_SLUG ? 
  `https://${process.env.REPL_SLUG}.repl.co` : 
  'http://localhost:5000';

async function pingHealthEndpoint() {
  try {
    const response = await fetch(`${APP_URL}/health`);
    console.log(`[${new Date().toISOString()}] Health check: ${response.status}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Health check failed:`, error);
  }
}

console.log(`Starting health check monitor for ${APP_URL}`);
pingHealthEndpoint(); // Initial ping
setInterval(pingHealthEndpoint, PING_INTERVAL);
