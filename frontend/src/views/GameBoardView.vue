<template>
  <div class="game-board p-5 text-white">
    <h1 class="text-2xl font-bold mb-4">游戏面板</h1>

    <p v-if="!gameStore.isConnected" class="text-yellow-400">正在连接服务器...</p>
    
    <div v-if="gameStore.currentUser" class="bg-gray-700 p-4 rounded-lg mb-4">
      <p>欢迎, <span class="font-bold">{{ gameStore.currentUser.name }}</span>!</p>
      <p>你的角色: <span class="font-bold text-cyan-400">{{ gameStore.currentUser.role }}</span></p>
      <p>你是说书人: {{ gameStore.isStoryteller ? '是' : '否' }}</p>
    </div>
    <div v-else class="text-gray-400">
      <p>正在获取用户信息...</p>
    </div>

    <div class="bg-gray-700 p-4 rounded-lg mb-4">
      <h2 class="font-semibold">游戏阶段: {{ gameStore.gamePhase }}</h2>
      <p v-if="gameStore.gamePhase === 'night'">第 {{ gameStore.nightNumber }} 晚</p>
    </div>

    <div class="bg-gray-700 p-4 rounded-lg">
        <h2 class="font-semibold mb-2">玩家列表 ({{ gameStore.playerList.length }}人)</h2>
        <ul>
            <li v-for="player in gameStore.playerList" :key="player.name">
                序号 {{ player.number }}: {{ player.name }} - ({{ player.role }})
            </li>
        </ul>
    </div>

    <button @click="handleLogout" class="mt-6 bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
      退出游戏
    </button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useSetupStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { socketService } from '@/services/socketService';

const gameStore = useSetupStore();
const authStore = useAuthStore();
const router = useRouter();

// 组件挂载时，启动对服务器事件的监听
// onMounted(() => {
//   gameStore.listenForUpdates();
// });

const handleLogout = () => {
  authStore.logout();
  gameStore.resetStore(); // 重置游戏状态
  socketService.disconnect(); // 断开 socket 连接
  router.push('/'); // 跳转到登录页
};
</script>