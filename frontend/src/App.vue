<script setup>
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { socketService } from '@/services/socketService';

const authStore = useAuthStore();

// onMounted 钩子会在 App 组件挂载到 DOM 后执行
// 这意味着每次应用加载或刷新页面时，这段代码都会运行一次
onMounted(() => {
  // 检查 auth store 中是否存在 token
  // 因为 auth store 现在会从 localStorage 初始化，所以这个检查是可靠的
  if (authStore.isAuthenticated) {
    console.log('[App.vue] 检测到已登录状态，尝试重新连接 Socket...');
    // 如果用户已登录，则自动发起 socket 连接
    // socketService 内部会使用 authStore 中的 token 进行认证
    socketService.connect();
  }
});
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
