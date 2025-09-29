module.exports = {
  apps: [
    {
      name: "reciclaje-api",
      script: "src/app.js",
      cwd: "./reciclaje-api",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "reciclaje-pwa",
      script: "/home/ubuntu/ecopwa/reciclaje-pwa/node_modules/.bin/serve",
      args: "-s dist -l 5174",
      cwd: "/home/ubuntu/ecopwa/reciclaje-pwa",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5174
      }
    }
  ]
};
