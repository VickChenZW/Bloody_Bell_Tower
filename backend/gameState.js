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
    total_player_count: 0,
    roles_to_assign: [],
    assigned_roles: {},  // {username: role}
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
        return { ...gameState };
    },

    /**
     * 将游戏状态重置为初始值
     */
    resetState: () => {
        gameState = JSON.parse(JSON.stringify(initialState));
        console.log("[GameState] 游戏状态已重置.");
    },

    /**
     * 添加一个新玩家
     * @param {string} socketId - 玩家的 socket ID
     * @param {object} playerData - { name, number, role }
     */
    addPlayer: (socketId, playerData) => {
        gameState.players[socketId] = {
        ...playerData,
        is_dead: false,
        };
        console.log(
        `[GameState] 玩家 ${playerData.name} (ID: ${socketId}) 已添加.`
        );
    },

    /**
     * 移除一个玩家
     * @param {string} socketId - 玩家的 socket ID
     */
    removePlayer: (socketId) => {
        if (gameState.players[socketId]) {
        console.log(
            `[GameState] 玩家 ${gameState.players[socketId].name} 已移除.`
        );
        delete gameState.players[socketId];
        }
    },

    /**
     * 设置说书人信息
     * @param {string} socketId - 说书人的 socket ID
     * @param {string} username - 说书人的名字
     */
    setStoryteller: (socketId, username) => {
        gameState.storyteller.sid = socketId;
        gameState.storyteller.username = username;
        console.log(`[GameState] 说书人已设置为 ${username} (ID: ${socketId}).`);
    },

    /**
     * 移除说书人信息
     */
    removeStoryteller: () => {
        console.log(`[GameState] 说书人 ${gameState.storyteller.username} 已移除.`);
        gameState.storyteller.sid = null;
        gameState.storyteller.username = null;
    },

    /**
     * 根据 Socket ID 查找用户（玩家或说书人）
     * @param {string} socketId
     * @returns {object | null}
     */
    findUserBySocketId: (socketId) => {
        if (gameState.storyteller.sid === socketId) {
        return { ...gameState.storyteller, isStoryteller: true };
        }
        if (gameState.players[socketId]) {
        return { ...gameState.players[socketId], isStoryteller: false };
        }
        return null;
    },
};
