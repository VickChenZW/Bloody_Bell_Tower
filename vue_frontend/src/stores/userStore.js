import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { jwtDecode } from 'jwt-decode'

export const useUserStore = defineStore('user', () => {
// --- State ---
    const token = ref(localStorage.getItem('user-token') || null)
    const userInfo = ref(null)

    // --- Getters ---
    const isLoggedIn = computed(() => !!token.value)
    const isStoryteller = computed(() => userInfo.value?.isStoryteller || false)

    // --- Actions ---
    function setLoginInfo(newToken) {
        token.value = newToken
        localStorage.setItem('user-token', newToken)
        try {
        userInfo.value = jwtDecode(newToken)
        } catch (e) {
        console.error("Failed to decode token:", e)
        logout()
        }
    }

    function logout() {
        token.value = null
        userInfo.value = null
        localStorage.removeItem('user-token')
        // 可以在这里通知 socket断开连接
        // 并且强制页面刷新或跳转到登录页
        window.location.href = '/'
    }

    // 在应用加载时尝试从 localStorage 恢复状态
    function tryAutoLogin() {
        if (token.value) {
            try {
                userInfo.value = jwtDecode(token.value)
            } catch (e) {
                logout()
            }
        }
}

return { token, userInfo, isLoggedIn, isStoryteller, setLoginInfo, logout, tryAutoLogin }
})