module.exports = {
  apps: [
    {
      name: "nemesis-web",
      script: "npm",
      args: "run start --workspace=@nemesis/web",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "nemesis-bot",
      script: "npm",
      args: "run start --workspace=@nemesis/telegram-bot",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
