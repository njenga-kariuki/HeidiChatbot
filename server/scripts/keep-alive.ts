
import fetch from 'node-fetch';

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PORT = process.env.PORT || 5000;
const APP_URL = process.env.REPL_SLUG ? 
  `https://${process.env.REPL_SLUG}.repl.co` : 
  `http://0.0.0.0:${PORT}`;

async function pingHealthEndpoint() {
  try {
    const response = await fetch(`${APP_URL}/health`);
    if (response.ok) {
      console.log(`[${new Date().toISOString()}] Health check: ${response.status}`);
    } else {
      console.error(`[${new Date().toISOString()}] Health check failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Health check failed:`, error);
  }
}

console.log(`Starting health check monitor for ${APP_URL}`);
pingHealthEndpoint(); // Initial ping
setInterval(pingHealthEndpoint, PING_INTERVAL);
