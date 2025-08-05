// backend/server.js

// 1. 导入我们安装的库
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// 2. 初始化
const app = express();
app.use(cors()); // 允许跨域请求

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 允许所有来源的连接，开发时方便，生产时应设为前端地址
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000; // 和你原来一样，使用 5000 端口

// 3. 创建一个简单的 HTTP API 路由
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "后端服务器正在健康运行！" });
});

// 4. 设置 Socket.IO 的连接监听
io.on("connection", (socket) => {
  console.log(`一个新玩家连接成功: ${socket.id}`);

  // 监听断开连接事件
  socket.on("disconnect", () => {
    console.log(`玩家 ${socket.id} 已断开连接`);
  });
});

// 5. 启动服务器
server.listen(PORT, () => {
  console.log(`后端服务器已启动，正在监听端口 ${PORT}`);
});
