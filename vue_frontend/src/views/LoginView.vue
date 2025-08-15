<template>
    <div class="flex min-h-screen items-center justify-center bg-gray-900 p-4 font-sans text-white">
        <div class="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-2xl">
        <h1 class="mb-2 text-center text-3xl font-bold text-indigo-400">血染钟楼</h1>
        <h2 class="mb-8 text-center text-xl font-medium text-gray-300">暗流涌动 - 游戏助手</h2>

        <!-- 游戏模式选择 -->


        <!-- 动态表单容器 -->
        <div>
            <!-- 角色标签页 (玩家/说书人) -->
            <div class="mb-6">
            <div class="flex border-b border-gray-700">
                <button
                @click="isStoryteller = true"
                :class="['flex-1 border-b-2 py-3 text-lg font-semibold', isStoryteller ? 'border-rose-500 text-rose-100' : 'border-transparent text-gray-400']"
                >
                我是说书人
                </button>
                <button
                @click="isStoryteller = false"
                :class="['flex-1 border-b-2 py-3 text-lg font-semibold', !isStoryteller ? 'border-indigo-500 text-indigo-100' : 'border-transparent text-gray-400']"
                >
                我是玩家
                </button>             
            </div>
            </div>

            <!-- 玩家表单 -->
            <form v-if="!isStoryteller" @submit.prevent="handleLogin" class="space-y-6">
                <div>
                    <label for="player-username" class="mb-2 block text-sm font-medium text-gray-300">你的名字</label>
                    <input type="text" id="player-username" v-model="playerForm.username" class="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white" placeholder="例如：比巴卜" required>
                </div>
                <div>
                    <label for="player-number" class="mb-2 block text-sm font-medium text-gray-300">你的序号</label>
                    <input type="number" id="player-number" v-model.number="playerForm.number" class="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white" placeholder="例如：5" required>
                </div>
            <button type="button" class="w-full rounded-lg bg-indigo-600 py-3 px-4 font-bold text-white hover:bg-indigo-700">
                进入游戏
            </button>
            </form>

            <!-- 说书人表单 -->
            <form v-if="isStoryteller" @submit.prevent="handleLogin" class="space-y-6">
                <div class="mb-6 flex rounded-lg bg-gray-700 p-1">
                    <button
                    type="button"
                    @click="gameMode = 'random'"
                    :class="['flex-1 rounded-md py-2 text-md font-semibold', { 'bg-indigo-600 text-white': gameMode === 'random' }]"
                    >
                    随机分配
                    </button>
                    <button
                    type="button"
                    @click="gameMode = 'manual'"
                    :class="['flex-1 rounded-md py-2 text-md font-semibold', { 'bg-indigo-600 text-white': gameMode === 'manual' }]"
                    >
                    手动输入
                    </button>
                </div>
            <p class="text-sm text-gray-400">你将进入游戏配置页面，以设置玩家和角色。</p>
            <button type="submit" class="w-full rounded-lg bg-rose-600 py-3 px-4 font-bold text-white hover:bg-rose-700">
                {{ gameMode === 'manual' ? '创建游戏房间' : '配置新游戏' }}
            </button>
            </form>
        </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, h } from 'vue';

import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'vue-router';
import { socketService } from '../socket';
import { useGameStateStore } from '@/stores/gameStateStore';


// // --- 状态 ---
const gameMode = ref('random');
const userRole = ref('player');
const isStoryteller = ref(true);
const router = useRouter();
// const gameStore = useGameStore();
// const authStore = useAuthStore();
const userStore = useUserStore();




const playerForm = reactive({
username: '',
number: null,
role: '洗衣妇', // 默认值
});

const storytellerForm = reactive({
username: '说书人',
});

// // --- 方法 ---
// const handleLogin = async () => {
// try {
//     // const isStoryteller = userRole.value === 'storyteller';
//     const username = isStoryteller ? storytellerForm.username : playerForm.username;

//     if (!username || (!isStoryteller && !playerForm.number)) {
//     alert('信息填写不完整！');
//     return;
//     }

//     // 从环境变量中获取API基础URL，如果没有设置则使用默认值
//     const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
//     // 调用 API 获取 Token
//     const response = await fetch(`${API_BASE_URL}/api/login`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ username, isStoryteller: isStoryteller.value }),
//     });
//     const data = await response.json();

//     if (!response.ok) throw new Error(data.message || '登录失败');

//     // 更新 auth store 并连接 socket
//     authStore.loginSuccess(data.token);
//     socketService.connect();
    
//     // 玩家登录后，立即发送自己的详细信息
//     socketService.emit('player_join', { ...handleLoginInfo() });

//     // 根据角色和游戏模式进行跳转
//     if (isStoryteller) {
//     if (gameMode.value === 'random'){
//         router.push('/setup');
//     } else {
//         router.push('/game-board');
//     }
//     } else {
//     // 玩家登录后，立即发送自己的详细信息
//     //   socketService.emit('player_details', {
//     //     number: playerForm.number,
//     //     role: gameMode.value === 'manual' ? playerForm.role : '待分配',
//     // });
//     router.push('/game-board');
//     }
// } catch (error) {
//     console.error('登录失败:', error);
//     alert(`登录失败: ${error.message}`);
// }
// };

// const handleLoginInfo = () => {
// // 处理登录信息
// return { 
//     username:playerForm.username,
//     number: playerForm.number,
//     role:isStoryteller? '说书人' : (gameMode.value === 'manual' ? playerForm.role : '待分配'), 
//     isStoryteller: isStoryteller,
//     imp: playerForm.role === "小恶魔" ? ['is_evil'] : [],
//     sid: null
// };
// }

const handleLogin = async () => {
    // 处理登录逻辑
    try{
        let loginInfo = {}

        const URL = 'http://localhost:5000/api/login'
        if (isStoryteller.value) {
            loginInfo = {
                user: '说书人',
                role: '说书人',
                number:0,
                isStoryteller: isStoryteller.value,
                gameMode: gameMode.value,
            }
        }else{
            loginInfo = {
                user: playerForm.username,
                role: '小恶魔',
                number:playerForm.number,
                isStoryteller: isStoryteller.value,
                gameMode: null,
            }
        };

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginInfo),
        });
        
        const data = await response.json();        
        if (!response.ok) {throw new Error('登录失败');}
        
        const token = data.token;
        
        // 存储token
        // localStorage.setItem('user_token', token);
        userStore.setLoginInfo(token)
        socketService.connect();

        alert(`登录成功！${token}`)

        if (isStoryteller.value) {
            router.push('/setup');
        } 
    }catch (error) {
            console.error('登录失败:', error);
            alert(`登录失败: ${error.message}`);
        }


    // 在这里处理登录成功后的逻辑，比如跳转页面或更新状态}
}

</script>