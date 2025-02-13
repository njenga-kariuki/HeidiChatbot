
module.exports = {
  apps: [{
    name: 'app',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    kill_timeout: 3000,
    wait_ready: true
  }]
}
