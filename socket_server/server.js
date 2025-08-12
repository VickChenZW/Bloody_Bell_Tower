// file: socket_server_express/server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
// const fetch = require('node-fetch'); // 如果你的Node版本低于18，需要 npm install node-fetch

// --- 1. 初始化 ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // 允许所有来源的跨域请求，生产环境中应配置为你的前端域名
        methods: ["GET", "POST"]
    }
});

// Redis 客户端配置 (使用Docker时, 'redis' 就是主机名)
const redisUrl = 'redis://redis:6379';
const redisClient = createClient({ url: redisUrl });
const redisSubscriber = redisClient.duplicate(); // 创建一个专门用于订阅的副本

// 全局变量，用于追踪在线用户 (userId -> socketId 的映射)
const onlineUsers = new Map();

// --- 2. Socket.IO 事件处理 ---
io.on('connection', (socket) => {
    console.log(`一个新客户端连接了: ${socket.id}`);

    /**
     * @description 认证事件：客户端连接后必须发送的第一个事件
     * 它会验证JWT，如果成功，则将用户登记为“在线”
     */
    socket.on('authenticate', async ({ token }) => {
        if (!token) {
            console.log(`[Auth] 失败: ${socket.id} 未提供Token。`);
            return socket.disconnect(); // 没有 token，直接断开
        }

        try {
            // 【关键】调用Python后端的API来验证Token的有效性
            const response = await fetch('http://backend_api:8000/api/verify-token', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const userInfo = await response.json();
                console.log(`[Auth] 成功: 用户 ${userInfo.sub} 已通过认证。`);

                // 将用户信息和房间信息存到 socket 实例上，供后续使用
                socket.data.userId = userInfo.sub;

                // 登记在线用户
                onlineUsers.set(userInfo.sub, socket.id);
                if (userInfo.isStoryteller) {
                    onlineUsers.set('storyteller', socket.id);
                }
                
                // 通知前端认证成功
                socket.emit('authenticated', { message: '认证成功！' });

            } else {
                console.log(`[Auth] 失败: Token无效 (来自Python API的响应)。Socket ID: ${socket.id}`);
                socket.emit('authentication_failed', { message: 'Token无效或已过期' });
                socket.disconnect();
            }
        } catch (error) {
            console.error('[Auth] 验证Token时发生网络错误:', error);
            socket.disconnect();
        }
    });

    /**
     * @description 通用游戏行为网关
     * 接收所有来自客户端的游戏操作，并原封不动地转发给Python后端
     */
    socket.on('game_action', async (payload) => {
        const userId = socket.data.userId;
        if (!userId) {
            console.log(`收到来自未认证用户 (${socket.id}) 的 game_action，已忽略。`);
            return;
        }

        console.log(`[Action] 收到来自 ${userId} 的操作: ${payload.action}，转发给Python...`);

        try {
            // 将前端发来的原始 payload 和 userId 一起，直接转发给 Python API
            await fetch('http://backend_api:8000/api/game-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 注意：这里的 Authorization 头需要携带一个内部服务间通信的密钥，或者直接信任内部网络
                // 为了简化，我们先假设内部网络是可信的，并直接构造请求体
                body: JSON.stringify({
                    userId: userId,
                    payload: payload
                })
            });
            // 成功时，Node.js 不需要做任何事，等待Python通过Redis发布状态更新即可
        } catch (error) {
            console.error("[Action] 调用Python API失败:", error);
            socket.emit('action_failed', { message: '服务器内部通信错误' });
        }
    });

    /**
     * @description 断开连接事件
     * 清理在线用户列表
     */
    socket.on('disconnect', () => {
        const userId = socket.data.userId;
        if (userId) {
            console.log(`用户 ${userId} (${socket.id}) 已断开连接。`);
            // 从在线用户列表中移除
            onlineUsers.delete(userId);
            // 如果是说书人，也移除特殊标记
            if (onlineUsers.get('storyteller') === socket.id) {
                onlineUsers.delete('storyteller');
            }
        } else {
            console.log(`一个未认证的客户端 (${socket.id}) 已断开连接。`);
        }
    });
});


// --- 3. Redis 订阅与服务器启动 ---
async function startServer() {
    try {
        // 连接主 Redis 客户端
        await redisClient.connect();
        console.log('成功连接到 Redis (主客户端)。');
        
        // 连接专门用于订阅的 Redis 客户端
        await redisSubscriber.connect();
        console.log('成功连接到 Redis (订阅客户端)。');

        // === 订阅“全局广播”频道 ===
        await redisSubscriber.subscribe('game-updates', async (message) => {
            // 在单房间模式下，message 只是一个简单的 "update" 信号
            if (message === 'update') {
                console.log('[Redis] 收到全局更新通知，正在广播...');
                
                const latestStateJson = await redisClient.get('game_state');
                if (!latestStateJson) return;
                const latestState = JSON.parse(latestStateJson);

                // 全局广播给所有连接的客户端
                io.emit('update_game_state', latestState);
            }
        });

        // === 订阅“私信”频道 ===
        await redisSubscriber.subscribe('private-message', (message) => {
            try {
                const privateMessage = JSON.parse(message);
                const { targetUserId, eventName, payload } = privateMessage;

                console.log(`[Redis] 收到私信指令: 发送事件 '${eventName}' 给用户 '${targetUserId}'`);

                const targetSocketId = onlineUsers.get(targetUserId);
                if (targetSocketId) {
                    io.to(targetSocketId).emit(eventName, payload);
                } else {
                    console.log(`[Redis] 私信投递失败: 用户 ${targetUserId} 不在线。`);
                }
            } catch (e) {
                console.error('[Redis] 解析私信失败:', e);
            }
        });

        // 启动服务器
        const PORT = process.env.PORT || 4000;
        server.listen(PORT, () => {
            console.log(`实时通讯服务器正在监听端口 ${PORT}`);
        });

    } catch (err) {
        console.error('启动服务器或连接 Redis 失败:', err);
        process.exit(1); // 启动失败，直接退出进程
    }
}

// 启动！
startServer();