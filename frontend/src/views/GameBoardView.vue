// 职责：清晰地展示来自 gameStore 的数据。

<template>
  <div class="game-board p-5 text-white min-h-screen bg-gray-900">
    <!-- 顶部信息 -->
    <header class="bg-gray-800 p-4 rounded-xl mb-4 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-indigo-400">游戏大厅</h1>
        <p v-if="gameStore.currentUser" class="text-gray-300">
          欢迎, <span class="font-semibold">{{ gameStore.currentUser.username }}</span>
          <span v-if="!gameStore.isStoryteller"> ({{ gameStore.currentUser.number }}号)</span>
        </p>
      </div>
      <button @click="handleLogout" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
        退出游戏
      </button>
    </header>

    <!-- 主内容区 -->
    <main class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- 左侧：玩家列表 -->
      <section class="md:col-span-2 bg-gray-800 p-6 rounded-xl">
        <h2 class="text-xl font-bold mb-4">
          在线玩家 ({{ gameStore.playerList.length }})
        </h2>
        <div v-if="gameStore.playerList.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div v-for="player in gameStore.playerList" :key="player.username" class="bg-gray-700 p-3 rounded-lg text-center">
            <div class="text-xl font-bold">{{ player.number }}</div>
            <div class="text-md truncate">{{ player.username }}</div>
            <div v-if="gameStore.isStoryteller" class="text-xs text-indigo-300 mt-1">{{ player.role }}</div>
          </div>
        </div>
        <p v-else class="text-gray-400">还没有玩家加入...</p>
      </section>

      <!-- 右侧：游戏信息 -->
      <aside class="bg-gray-800 p-6 rounded-xl">
        <h2 class="text-xl font-bold mb-4">游戏状态</h2>
        <div class="space-y-2">
          <p>连接状态: 
            <span :class="gameStore.isConnected ? 'text-green-400' : 'text-yellow-400'">
              {{ gameStore.isConnected ? '已连接' : '连接中...' }}
            </span>
          </p>
          <p>游戏阶段: <span class="font-semibold">{{ gameStore.gamePhase }}</span></p>
          <div v-if="gameStore.storyteller">
            说书人: <span class="font-semibold">{{ gameStore.storyteller.username }}</span>
          </div>
          <div v-if="gameStore.gamePhase === 'setup_complete'">
            <h3 class="font-semibold mt-4">本局配置:</h3>
            <p>玩家人数: {{ gameStore.gameConfig.playerCount }}</p>
            <p>已选角色: {{ gameStore.gameConfig.roles.join(', ') }}</p>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { socketService } from '@/services/socketService';

const gameStore = useGameStore();
const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  gameStore.resetStore();
  socketService.disconnect();
  router.push('/');
};
</script>