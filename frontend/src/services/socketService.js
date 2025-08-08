// frontend/src/services/socketService.js 处理前端的socket连接事件处理

import { io } from "socket.io-client";
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/gameStore';

// 从环境变量中获取API基础URL，如果没有设置则使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// 将 socket 实例放在服务内部管理，而不是全局导出
let socket = null;

export const socketService = {
  connect() {
    // 获取 Pinia store
    const authStore = useAuthStore();
    const gameStore = useGameStore();

    // 如果没有 token 或者已经连接，则不执行任何操作
    if (!authStore.isAuthenticated || (socket && socket.connected)) {
      console.log('Socket connect skipped: no token or already connected.');
      return;
    }

    console.log('Attempting to connect with token:', authStore.token);

    // 创建新的 Socket 连接，并通过 auth 对象传递 token
    socket = io(API_BASE_URL, {
      // 核心改动：在 auth 对象中携带 token
      auth: {
        token: authStore.token
      }
    });

    // --- 监听核心事件 ---

    socket.on('connect', () => {
      console.log('[Socket] Successfully connected with ID:', socket.id);
      // 连接成功后，可以通知 gameStore
      gameStore.setSocketConnected(true);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection failed:', err.message);
      // 如果是认证失败，则自动登出
      if (err.message === '认证失败') {
        authStore.logout();
        // 你可以在这里添加一个全局提示，告诉用户会话已过期
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      gameStore.setSocketConnected(false);
    });

    // 核心监听器：当收到 'update_state' 事件时，调用 gameStore 的 action
    socket.on('update_state', (newState) => {
      console.log('[Socket] Received state update from server.');
      gameStore.setGameState(newState);
    });
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // 封装 emit 方法，方便组件调用
  emit(event, data) {
    if (socket) {
      socket.emit(event, data);
    } else {
      console.error('Socket没有连接，无法发送事件:', event);
    }
  }
};