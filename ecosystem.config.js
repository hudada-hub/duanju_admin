module.exports = {
  apps: [
    {
      name: "study_platform_admin",       // 应用名称
      script: "npm",           // 使用 npm 作为启动器
      args: "start",          // 运行 npm start
      cwd: "/root/study_platform_admin", // 应用绝对路径
     
      autorestart: true,       // 崩溃自动重启
      watch: false,            // 禁用文件监视
      max_memory_restart: "1G", // 内存超限重启
      env: {
        NODE_ENV: "production",
        PORT: 3006            // 端口号（需与 next.config.js 一致）
      }
    }
  ]
};