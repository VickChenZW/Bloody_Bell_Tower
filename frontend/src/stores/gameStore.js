// 职责：作为后端 gameState 的响应式镜像。

import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', {
  state: () => ({
    // 完整地镜像后端 gameState 结构
    players: {}, // { username: { number, role, sid, isStoryteller, isDead, ... } }
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
  }),
  
  getters: {
    // 将 Object 形式的 players 转换为 Array，方便 v-for
    playerList: (state) => Object.values(state.players),
    isStoryteller: (state) => state.currentUser?.isStoryteller === true,
  },
  
  actions: {
    // 唯一的更新入口：用从服务器收到的新状态完全覆盖旧状态
    setGameState(newState) {
      this.players = newState.players;
      this.gamePhase = newState.gamePhase;
      this.nightNumber = newState.nightNumber;
      this.actionLogs = newState.actionLogs;
      this.storyteller = newState.storyteller;
      this.gameConfig = newState.gameConfig;
      this.currentUser = newState.currentUser;
    },

    setSocketConnected(status) {
      this.isConnected = status;
    },

    resetStore() {
      this.$reset();
    }
  }
});