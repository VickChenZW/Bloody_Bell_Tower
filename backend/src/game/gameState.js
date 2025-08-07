// backend/gameState.js

// 1. 定义初始的游戏状态结构
const initialState = {
    players: {}, // { 'socket.id': { name, number, role, is_dead, ... } }
    storyteller: {
        sid: null,
        username: null,
    },
    
    gamePhase: "waiting",// '游戏轮次 waiting day night
    nightNumber: 0,// 夜数
    actionLogs: [], // 游戏日志[{ action, player, target, timestamp }]
    night_actions_completed: [],
    current_vote: null,

    gameMode: "manual",
    gameConfig: {
        total_player_count: 0,
        roles_to_assign: [],
        assigned_roles: {},  // {username: role}
    },
 // {username: role}
};

// 2. 创建一个深拷贝的、可被重置的游戏状态对象
let gameState = JSON.parse(JSON.stringify(initialState));

// 3. 导出一个包含了所有状态管理逻辑的对象
export const gameManager = {
    /**
     * 获取当前游戏状态的一个安全拷贝
     * @returns {object} 当前游戏状态
     */
    getState: () => {
        return JSON.parse(JSON.stringify(gameState));
    },

    /**
     * 将游戏状态重置为初始值
     */
    resetState: () => {
        gameState = JSON.parse(JSON.stringify(initialState));
        console.log("[GameState] 游戏状态已重置.");
    },

    /**
    * 添加或更新一个玩家
    * @param {string} username - 玩家的名字 (唯一标识)
    * @param {object} playerData - { number, role, sid }
    */
    addOrUpdatePlayer: (username, playerData) => {
        if (!gameState.players[username]) {
        gameState.players[username] = {
            username,
            isDead: false,
            ...playerData,
        };
        console.log(`[GameState] 玩家 ${username} 已添加.`);
        } else {
        // 如果玩家已存在（重连），只更新 socket id 和其他可能变化的信息
        gameState.players[username] = {
            ...gameState.players[username], // 保留旧信息
            ...playerData, // 用新信息覆盖
            sid: playerData.sid,
        };
        console.log(`[GameState] 玩家 ${username} 已重连/更新.`);
        }
    },

    /**
     * 移除一个玩家 (当 socket 断开时)
     * @param {string} socketId - 玩家的 socket ID
     * @returns {string|null} 被移除玩家的用户名
     */
    removePlayerBySocketId: (socketId) => {
    const username = Object.keys(gameState.players).find(
        (key) => gameState.players[key].sid === socketId
    );
    if (username) {
        // 在实际游戏中，你可能不想删除玩家，而是标记为 'disconnected'
        // 这里为了简单，我们直接将sid设为null
        gameState.players[username].sid = null;
        console.log(`[GameState] 玩家 ${username} 已断开连接.`);
        return username;
    }
    return null;
    },

    /**
     * 设置说书人
     * @param {string} username
     * @param {string} sid
     */
    setStoryteller: (username, sid) => {
        // 如果已有说书人，重置游戏
        if (gameState.storyteller) {
            gameManager.resetState();
        }
        gameState.storyteller = { username, sid };
        console.log(`[GameState] 说书人已设置为 ${username}.`);
    },

    /**
     * 移除说书人
     */
    removeStoryteller: () => {
        if (gameState.storyteller) {
            console.log(`[GameState] 说书人 ${gameState.storyteller.username} 已移除.`);
            gameState.storyteller = null;
        }
    },

    /**
     * 更新游戏设置
     * @param {object} config - { playerCount, roles }
     */
    setGameConfig: (config) => {
        gameState.gameConfig = config;
        gameState.gamePhase = 'setup_complete'; // 更新游戏阶段
        console.log('[GameState] 游戏配置已更新:', config);
    },
    
    /**
     * 根据 Socket ID 查找用户信息
     * @param {string} socketId 
     * @returns {object | null} 
     */
    getUserBySocketId: (socketId) => {
        if (gameState.storyteller && gameState.storyteller.sid === socketId) {
            return { ...gameState.storyteller, isStoryteller: true };
        }
        const username = Object.keys(gameState.players).find(
            (key) => gameState.players[key].sid === socketId
        );
        if (username) {
            return { ...gameState.players[username], isStoryteller: false };
        }
        return null;
    },
};