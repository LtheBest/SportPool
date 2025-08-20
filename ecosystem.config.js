export default {
  apps: [{
    name: 'webapp',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/user/webapp',
    watch: false,
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    time: true
  }]
};