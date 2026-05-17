/** PM2 — opcional: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'castro-store-bot',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
