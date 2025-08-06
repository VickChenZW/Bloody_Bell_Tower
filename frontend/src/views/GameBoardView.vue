<template>
  <div class="game-board">
    <h1>游戏面板</h1>
    <div v-if="gameStore.currentUser">
      <p>欢迎, {{ gameStore.currentUser.name }}!</p>
      <p>你的角色: {{ gameStore.currentUser.role }}</p>
      <p>你是说书人: {{ gameStore.currentUser.isStoryteller ? '是' : '否' }}</p>
    </div>
    <div v-else>
      <p>加载中...</p>
    </div>
    <button @click="handleEndGame" class="bg-red-600">结束游戏</button>

  </div>
</template>

<script setup>
import { useSetupStore } from '@/stores/gameStore';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';



// 获取游戏store实例
const gameStore = useSetupStore();
const router = useRouter();
const authStore = useAuthStore();

const endGame = () => {
  authStore.logout();
}

const handleEndGame = () => {
  endGame();
  router.push({ name: 'LoginView' });
}

</script>

<style scoped>
.game-board {
  padding: 20px;
}
</style>