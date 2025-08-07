import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import cors from 'cors';
import jwt from "jsonwebtoken";
// 1. 导入新的 socket 事件处理器
import { initializeSocketHandlers } from './game/socketHandlers.js';
import { gameManager } from './game/gameState.js'; // 导入 gameManager 用于登录检查

// --- 初始化 (保持不变) ---
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});
const SECRET_KEY = 'a-very-secret-key-for-your-game';

// --- Token 验证中间件 (修复二次进入的bug) ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('认证失败：缺少Token'));
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return next(new Error('认证失败：无效Token'));
    }
    // 将解码后的用户信息附加到 socket 对象上，供后续使用
    socket.decoded = decoded; 
    next();
  });
});

// --- API 路由 (增加用户名冲突检查) ---
app.post('/api/login', (req, res) => {
  const { username, isStoryteller } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: '用户名不能为空' });
  }

  const currentState = gameManager.getState();
  // 检查用户名是否已被占用
  if (currentState.players[username] && currentState.players[username].sid) {
    return res.status(409).json({ success: false, message: '该玩家用户名已被使用' });
  }
  if (currentState.storyteller && currentState.storyteller.username === username) {
      return res.status(409).json({ success: false, message: '该用户名已被说书人使用' });
  }


  const token = jwt.sign({ username, isStoryteller }, SECRET_KEY, { expiresIn: '24h' });
  res.json({ success: true, token });
});

// 2. 委托 Socket 事件处理
initializeSocketHandlers(io);

// --- 启动服务器 (保持不变) ---
const PORT = 5000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`后端服务器已启动，正在监听端口 ${PORT}`);
});