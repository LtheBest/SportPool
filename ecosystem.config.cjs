module.exports = {
  apps: [{
    name: 'webapp',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/user/webapp',
    watch: false,
    env: {
      NODE_ENV: 'development',
      PORT: 8080
    },
    time: true,
    autorestart: true,
    max_restarts: 10
  }]
};