import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import SetupView from '../views/SetupView.vue'
// import GameBoardView from '../views/GameBoardView.vue' 
// 1. 导入我们新建的、专门负责认证的 authStore
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'game-board',
      component: SetupView,
      // meta: { requiresAuth: true } // 标记这个页面需要登录
    },
    {
      path: '/login',
      name: 'login',
      component: SetupView
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('../views/SetupView.vue'),
      meta: { requiresAuth: true, requiresStoryteller: true }
    }
  ]
})

// 增强版的导航守卫
router.beforeEach((to, from, next) => {
  // 在守卫函数内部获取 authStore 实例
  const authStore = useAuthStore();
  
  // 2. 使用 authStore.isAuthenticated 作为唯一的登录判断依据
  const isAuthenticated = authStore.isAuthenticated;
  const needsAuth = to.meta.requiresAuth;

  // 情况1：用户已登录，但想访问登录页
  if (to.name === 'login' && isAuthenticated) {
    // 阻止他们，并直接送回游戏主板
    next({ name: 'game-board' });
  } 
  // 情况2：用户未登录，但想访问一个需要登录的页面
  else if (needsAuth && !isAuthenticated) {
    // 阻止他们，并直接送去登录页
    next({ name: 'login' });
  } 
  // 情况3：其他所有情况 (已登录访问受保护页，或未登录访问公共页)
  else {
    // 正常放行
    next();
  }
})

export default router
