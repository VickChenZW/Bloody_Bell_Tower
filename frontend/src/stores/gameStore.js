// frontend/src/stores/gameStore.js
import { defineStore } from 'pinia';
import { socketService } from '@/services/socketService'; // 导入我们的 socket 服务
import * as config from '@/config/gameConfig';

export const useSetupStore = defineStore('setup', {
  state: () => ({
    // 游戏进行中的状态
    players: {},
    gamePhase: 'not_started',
    nightNumber: 0,
    actionLogs: [],
    currentVote: null,

    // 游戏设置阶段的状态
    gameMode: 'manual',
    storyteller: null,
    
    // 当前用户信息 (将由服务器在 update_state 事件中提供)
    currentUser: null,
    
    // Socket 连接状态
    isConnected: false,

    // 静态配置
    roles: config.ROLES,
    roleDescriptions: config.ROLE_DESCRIPTIONS,
  }),
  
  getters: {
    
    playerList: (state) => Object.values(state.players),
    livingPlayers: (state) => Object.values(state.players).filter(p => !p.is_dead),
    // 一个方便的 getter，判断当前用户是否是说书人
    isStoryteller: (state) => state.currentUser?.isStoryteller === true,
  },
  
  actions: {
    // Action: 由 socketService 调用，用于更新整个游戏状态
    setGameState(newState) {
      this.players = newState.players;
      this.gamePhase = newState.game_phase;
      this.nightNumber = newState.night_number;
      this.actionLogs = newState.action_logs;
      this.storyteller = newState.storyteller_username ? { name: newState.storyteller_username } : null;
      this.currentVote = newState.current_vote;
      this.gameMode = newState.game_mode;
      this.currentUser = newState.currentUser; // 直接接收后端处理好的 currentUser
    },

    // Action: 更新 socket 连接状态
    setSocketConnected(status) {
      this.isConnected = status;
    },

    // Action: 组件调用此方法来加入游戏 (通过 socket service 发送事件)
    joinGame(payload) {
      socketService.emit('join_game', payload);
    },
    
    // Action: 说书人调用此方法开始游戏
    startGame(finalConfig) {
      socketService.emit('start_game_setup', finalConfig);
    },
    
    // Action: 玩家在游戏中执行动作
    sendPlayerAction(actionData) {
      socketService.emit('player_action', actionData);
    },

    // Action: 在登出时重置状态
    resetStore() {
        this.$reset();
    }
  }
});