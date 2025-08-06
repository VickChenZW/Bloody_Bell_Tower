//  管理整个游戏的实时状态（gameState 的前端镜像）
import { defineStore } from 'pinia';
import socket from '@/socket';
import * as config from '@/config/gameConfig'

export const useSetupStore = defineStore('setup', {
  // State: 存储最核心的数据
  state: () => ({
      // 游戏进行中的状态
      players: {}, // { 'player_name': { number, role, is_dead, ... } }
      gamePhase: 'not_started', // "not_started", "night", "day", "voting"
      nightNumber: 0,
      actionLogs: [],
      currentVote: null,

      // 游戏设置阶段的状态
      gameMode: 'manual',
      storyteller: null, // { id, name }
      
      // 当前用户信息
      currentUser: null, // { name, role, isStoryteller }
      
      // 静态配置 (也可以直接从 config 导入使用)
      roles: config.ROLES,
      roleDescriptions: config.ROLE_DESCRIPTIONS,

      // 游戏设置阶段的状态
      selectedRoles: {}, // { 'player_name': 'role' }
      playerCount: 0, // 需要选择的玩家数量
      
    }),
  
  
    // 2. Getters: 方便地从 state 中派生数据
  getters: {
    playerList: (state) => Object.values(state.players),
    livingPlayers: (state) => Object.values(state.players).filter(p => !p.is_dead),
  },
  
  
// 3. Actions: 封装与后端通信和状态变更的逻辑
  actions: {
    // 核心 Action: 监听服务器广播，并用新状态完全覆盖本地状态
    listenForUpdates() {
      socket.on('update_state', (newState) => {
        console.log('收到服务器状态更新:', newState);
        // 用从服务器收到的权威状态，直接替换本地的所有相关状态
        this.players = newState.players;
        this.gamePhase = newState.game_phase;
        this.nightNumber = newState.night_number;
        this.actionLogs = newState.action_logs;
        this.storyteller = newState.storyteller_username ? { name: newState.storyteller_username } : null;
        this.currentVote = newState.current_vote;
        this.gameMode = newState.game_mode;
        
        // 更新当前用户信息
         // 注意：这需要后端在newState中包含当前用户的信息，
         // 或者前端能够通过socket.id或其他方式识别当前用户
         // 由于前端在连接时发送了token，后端知道每个socket连接的用户信息
         // 一种方法是后端在update_state事件中包含当前用户的信息
         // 另一种方法是前端通过socket.id在newState.players中查找
        if (newState.currentUser) {
          this.currentUser = newState.currentUser;
        } else {
          // 如果后端没有提供currentUser，尝试通过socket.id查找
          // 注意：这需要后端在players对象中使用socket.id作为键
          const player = newState.players[socket.id];
          if (player) {
            this.currentUser = {
              name: player.name,
              role: player.role,
              isStoryteller: false // 玩家不是说书人
            };
          } else if (newState.storyteller_sid === socket.id) {
            this.currentUser = {
              name: newState.storyteller_username,
              role: 'storyteller',
              isStoryteller: true // 说书人
            };
          }
        }
    });
    },

    // 供 LoginView 调用，用于加入游戏
    joinGame(payload) {
      // payload: { name, number, role, gameMode, isStoryteller }
      socket.emit('join_game', payload);
    },
    
    // 供 SetupView 调用，用于最终确定游戏配置
    startGame(finalConfig) {
      // finalConfig: { storyteller, players, roles_to_assign, game_mode }
      socket.emit('start_game_setup', finalConfig);
    },

    // 游戏中的玩家动作，只负责发送意图，不修改本地 state
    sendPlayerAction(actionData) {
      // actionData: { action_type: 'vote', target: 'player_name', ... }
      console.log('向服务器发送玩家动作:', actionData);
      socket.emit('player_action', actionData);
      // 注意：这里不修改 this.state！等待服务器广播 'update_state' 来同步变更。
    }
  }
})