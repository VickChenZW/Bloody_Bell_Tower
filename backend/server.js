// backend/server.js
// 【后端核心】主服务器文件。负责启动服务、管理 gameState、处理所有 Socket.IO 事件

import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import cors from 'cors';
import jwt from "jsonwebtoken";

// 1. 导入我们的游戏配置
import * as config from './gameConfig.js';
import { gameManager } from './gameState.js';

// --- 初始化服务器 ---
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// --- 配置 ---
const SECRET_KEY = 'a-very-secret-key-for-your-game';

// 添加Socket.IO中间件来验证token
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('认证失败'));
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return next(new Error('认证失败'));
    }
    socket.decoded = decoded;
    next();
  });
});



app.post('/api/login', (req, res) => {
  const username = req.body.username;
  const isStoryteller = req.body.isStoryteller;
  
  console.log(username, isStoryteller)

  // 检查用户名是否已被占用
  const nameExists = Object.values(gameManager.getState().players).some(p => p.name === username) || gameManager.getState().storyteller_username === username;

  if (nameExists) {
    return res.status(409).json({ success: false, message: '该用户名已被使用' });
  }

  const role = req.body.role;
  const number = req.body.number;

  // 用户名可用，生成 Token
  console.log('生成 Token 前:', { username, role, number });

  const token = jwt.sign(
    { username, role, number}, // Token 中包含的信息
    SECRET_KEY,
    { expiresIn: '6h' } // Token 有效期6小时
  );
  console.log('生成 Token 后:', token);

  res.json({ success: true, token });
});


const broadcastGameState = () => {
  const currentState = gameManager.getState();
  
  // 遍历所有连接的客户端
  io.sockets.sockets.forEach((socket) => {
    // 为这个特定的 socket 定制一个包含 'currentUser' 的状态对象
    const userSpecificState = {
      ...currentState,
      currentUser: gameManager.findUserBySocketId(socket.id)
    };
    // 只向该 socket 发送
    socket.emit('update_state', userSpecificState);
  });
  console.log('[Broadcast] 已向所有客户端广播最新状态。');
};



// --- Socket.IO 事件监听 ---
io.on('connection', (socket) => {
  console.log(`[连接] 新客户端连接: ${socket.id}`);

  // 立即将当前游戏状态发送给新连接的客户端
  // 为当前用户添加特定信息
  
  socket.emit('update_state', {
    ...gameManager.getState(),
    currentUserState: gameManager.findUserBySocketId(socket.id)
  });

  // 监听 'join_game' 事件
  socket.on('join_game', (data) => {
    console.log(`[加入] 收到加入请求:`, data);

    if (data.isStoryteller) {
      gameManager.setStoryteller(socket.id, data.name);
    } else {
      gameManager.addPlayer(socket.id, {
        name: data.name,
        number: data.number,
        role: data.role || '待分配',
      });
    }
    // 将更新后的游戏状态广播给所有客户端
    broadcastGameState();
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
    if (socket.id === gameManager.getState().storyteller_sid) {

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