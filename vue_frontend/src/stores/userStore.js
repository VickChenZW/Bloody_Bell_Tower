import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'

export const useUserStore = defineStore('token', {
    state: () => ({
        token: null,
    }),
    actions: {
        setToken(token) {
            this.token = token
        },
        getToken() {
            return this.token
        },
        getTokenInfo() {
            if (this.token) {
                return jwtDecode(this.token)
            }
            return null
        },
        clearToken() {
            this.token = null
        }
    },
})