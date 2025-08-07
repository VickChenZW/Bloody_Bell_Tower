// 职责：添加路由守卫，防止未登录用户访问受保护页面。

import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/gameStore';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('../views/SetupView.vue'),
      meta: { requiresAuth: true, requiresStoryteller: true } // 添加元信息
    },
    {
      path: '/game-board',
      name: 'game-board',
      component: () => import('../views/GameBoardView.vue'),
      meta: { requiresAuth: true } // 添加元信息
    }
  ]
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const gameStore = useGameStore(); // 假设已导入

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 如果需要认证但用户未登录，跳转到登录页
    next({ name: 'login' });
  // } else if (to.meta.requiresStoryteller && !gameStore.isStoryteller) {
  //   // 如果需要说书人权限但用户不是，跳转到游戏面板
  //   next({ name: 'game-board' });
  }
  else {
    // 否则，正常放行
    next();
  }
});

export default router;