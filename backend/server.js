// backend/server.js
// 【后端核心】主服务器文件。负责启动服务、管理 gameState、处理所有 Socket.IO 事件

import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import cors from 'cors';
// 1. 导入我们的游戏配置
import * as config from './gameConfig.js';
import jwt from "jsonwebtoken";

// --- 初始化服务器 ---
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// --- 配置 ---
const SECRET_KEY = 'a-very-secret-key-for-your-game';

app.post('/api/login', (req, res) => {
  const { username, isStoryteller } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: '用户名不能为空' });
  }

  // 检查用户名是否已被占用
  const nameExists = Object.values(gameState.players).some(p => p.name === username) || gameState.storyteller_username === username;
  if (nameExists) {
    return res.status(409).json({ success: false, message: '该用户名已被使用' });
  }

  // 用户名可用，生成 Token
  const role = isStoryteller ? 'storyteller' : 'player';
  const token = jwt.sign(
    { username, role }, // Token 中包含的信息
    SECRET_KEY,
    { expiresIn: '6h' } // Token 有效期6小时
  );

  res.json({ success: true, token });
});




// --- 游戏状态管理 (唯一真相之源) ---
let gameState = {
  players: {}, // { 'socket.id': { name, number, role, is_dead, ... } }
  game_phase: "not_started",
  night_number: 0,
  action_logs: [],
  storyteller_sid: null,
  storyteller_username: null,
  game_mode: "manual",
  // ... 其他你需要的状态
};

// --- Socket.IO 事件监听 ---
io.on('connection', (socket) => {
  console.log(`[连接] 新客户端连接: ${socket.id}`);

  // 立即将当前游戏状态发送给新连接的客户端
  socket.emit('update_state', gameState);

  // 监听 'join_game' 事件
  socket.on('join_game', (data) => {
    console.log(`[加入] 收到加入请求:`, data);

    if (data.isStoryteller) {
      gameState.storyteller_sid = socket.id;
      gameState.storyteller_username = data.name;
      console.log(`[说书人] ${data.name} 已成为说书人。`);
    } else {
      // 检查玩家是否已存在
      const playerExists = Object.values(gameState.players).some(p => p.name === data.name || p.number === data.number);
      if (playerExists) {
        console.log(`[失败] 玩家 ${data.name} 或序号 ${data.number} 已存在。`);
        // 你可以向该玩家发送一个错误提示
        socket.emit('join_error', { message: '该名字或序号已被使用' });
        return;
      }
      gameState.players[socket.id] = {
        name: data.name,
        number: data.number,
        role: data.role || '待分配',
        is_dead: false,
      };
      console.log(`[玩家] 新玩家 ${data.name} (序号${data.number}) 已加入。`);
    }

    // 将更新后的游戏状态广播给所有客户端
    io.emit('update_state', gameState);
  });

  // 监听 'start_game_setup' 事件
  socket.on('start_game_setup', (newPlayersState) => {
    if (socket.id === gameState.storyteller_sid) {
      console.log('[设置] 收到说书人的游戏配置:', newPlayersState);
      // 更新所有玩家的角色信息
      Object.keys(gameState.players).forEach(id => {
        const updatedPlayer = newPlayersState.find(p => p.id === id);
        if (updatedPlayer) {
          gameState.players[id].role = updatedPlayer.role;
        }
      });
      gameState.game_phase = "night"; // 游戏正式开始
      gameState.night_number = 1;
      io.emit('update_state', gameState);
      console.log('[开始] 游戏已开始，广播最终配置。');
    }
  });

  // 监听断开连接事件
  socket.on('disconnect', () => {
    console.log(`[断开] 客户端断开连接: ${socket.id}`);
    let stateChanged = false;
    if (socket.id === gameState.storyteller_sid) {
      gameState.storyteller_sid = null;
      gameState.storyteller_username = null;
      stateChanged = true;
      console.log('[说书人离开]');
    } else if (gameState.players[socket.id]) {
      delete gameState.players[socket.id];
      stateChanged = true;
      console.log('[玩家离开]');
    }

    if (stateChanged) {
      io.emit('update_state', gameState);
    }
  });

  socket.on('setup', (data) => {
    console.log('[设置] 收到游戏设置:', data);
  })

});


// --- 启动服务器 ---
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`后端服务器已启动，正在监听端口 ${PORT}`);
});
