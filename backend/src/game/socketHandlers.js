// backend/socketHandlers.js (新建文件)
// 职责：处理所有 socket.io 事件，调用 gameManager 修改状态，并广播更新。

import { gameManager } from './gameState.js';

// 广播函数，将最新状态发送给所有客户端
const broadcastGameState = (io) => {
    const currentState = gameManager.getState();

  // 为每个客户端量身定制包含 'currentUser' 的状态
    io.sockets.sockets.forEach((socket) => {
        const userSpecificState = {
            ...currentState,
            currentUser: gameManager.getUserBySocketId(socket.id)
    };
    socket.emit('update_state', userSpecificState);
    });
    console.log('[Broadcast] 已向所有客户端广播最新状态。');
};

// 主函数，用于在 server.js 中初始化所有事件监听器
export function initializeSocketHandlers(io) {
    // 监听连接事件
    io.on('connection', (socket) => {
        // 从 socket 中提取用户名和身份
        const { username, isStoryteller } = socket.decoded;
        console.log(`[连接] 用户 '${username}' (${isStoryteller ? '说书人' : '玩家'}) 已连接, SID: ${socket.id}`);

    // --- 处理用户加入 ---
    if (isStoryteller) {
        gameManager.setStoryteller(username, socket.id);
    } else {
      // 玩家连接时，只更新sid，等待客户端发送详细信息
        gameManager.addOrUpdatePlayer(username, { sid: socket.id });
    }
    broadcastGameState(io);


    // --- 监听来自客户端的事件 ---

    // 监听玩家发送的详细信息
    socket.on('player_details', (details) => {
        if (!isStoryteller) {
            gameManager.addOrUpdatePlayer(username, {
                ...details,
                sid: socket.id
            });
            broadcastGameState(io);
        }
    });
    
    // 监听说书人设置游戏
    socket.on('game_setup', (config) => {
        if (isStoryteller) {
            gameManager.setGameConfig(config);
            broadcastGameState(io);
        }
    });

    // --- 处理用户断开 ---
    socket.on('disconnect', () => {
        console.log(`[断开] 用户 '${username}' 已断开连接: ${socket.id}`);
        if (isStoryteller) {
            gameManager.removeStoryteller();
            gameManager.resetState(); // 说书人离开，游戏重置
        } else {
            gameManager.removePlayerBySocketId(socket.id);
        }
        broadcastGameState(io);
        });
    });
}