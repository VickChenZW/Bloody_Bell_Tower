// frontend/src/socket.js
import { io } from "socket.io-client";

// 创建一个函数来动态获取token
const getAuthToken = () => {
  // 检查Pinia是否已经初始化
  try {
    const { useAuthStore } = require('@/stores/auth');
    const authStore = useAuthStore();
    return authStore.token;
  } catch (error) {
    console.warn('Pinia not initialized yet, returning null token');
    return null;
  }
};

// 连接io携带
const socket = io("http://localhost:5000", {
    auth: {
        token: getAuthToken()
    }
});

export default socket;