// frontend/src/stores/auth.js
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  // 1. State: 我们的状态只有一个，就是 token
  state: () => ({
    // 应用启动时，尝试从浏览器的 localStorage 中读取之前保存的 token
    token: localStorage.getItem('user-token') || null,
  }),

  // 2. Getters: 从 state 派生出的“计算属性”
  getters: {
    // 这是我们判断用户是否登录的唯一依据！
    isAuthenticated: (state) => !!state.token,
  },

  // 3. Actions: 修改 state 的方法
  actions: {
    // 在登录成功后，由 LoginView 调用
    loginSuccess(token) {
      this.token = token;
      localStorage.setItem('user-token', token);
    },

    // 在用户点击“退出登录”时调用
    logout() {
      this.token = null;
      localStorage.removeItem('user-token');
      // 页面跳转的逻辑将由调用 logout 的组件来完成
    }
  }
});
