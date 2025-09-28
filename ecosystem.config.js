module.exports = {
  apps: [
    {
      name: 'reciclaje-api',
      script: './reciclaje-api/src/app.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        FRONTEND_URL: 'https://dondereciclo.com.ar'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};