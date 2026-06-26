module.exports = {
  apps: [
    {
      name: "nemesis-web",
      cwd: "./apps/web",
      script: "../../node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "nemesis-bot",
      cwd: "./apps/telegram-bot",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
