import { defineStore } from 'pinia'
import { ref } from 'vue'
// import {gameConfig} from '@/config/gameConfig'


export const useGameStateStore = defineStore('gameState',{
    state: () => ({
        gameState:{
            // players: null,
            // game_phase: "not_started",
            // night_number: 0,
            // action_logs: null,
            // storyteller_username: null,
            // night_actions_completed: [],
            // current_vote: null,

            // //  新增：用于随机分配模式的状态
            // game_mode: 'manual',  // 'manual' or 'random',
            // total_player_count: 0,
            // roles_to_assign: [],
            // assigned_roles: {},  //{username: role}
            // is_game_ready_to_start: false,
            play_phase: "no_storyteller",

        }

    }),

    actions:{
        updateGameState(newstate){
            this.gameState = newstate;
        }

    }
})

