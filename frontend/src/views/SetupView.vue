// 职责：让说书人配置游戏，并将配置发送到后端。
<template>
    <head>
        <title>游戏配置</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body class="bg-gray-900 text-white pb-96 flex flex-col">
        <div class="container mx-auto p-4 sm:p-8 max-w-4xl">
            <h1 class="text-3xl font-bold text-center text-indigo-400 mb-8">配置新游戏 (随机分配模式)</h1>
            <form @submit="handleLogin">
                <!-- 步骤一：设置玩家人数 -->
                <div class="bg-gray-800 p-6 rounded-xl mb-8">
                    <label for="player_count" class="block text-xl font-medium text-gray-200 mb-3">1. 设置总玩家人数</label>
                    <input type="number" v-model="playerCount" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 text-lg" placeholder="例如：10" required min="2">
                </div>

                <!-- 步骤二：选择角色 -->
                <div class="bg-gray-800 p-6 rounded-xl mb-8">
                    <h2 class="text-xl font-medium text-gray-200 mb-4">2. 选择本局游戏的角色</h2>
                    <div id="role-selection-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <div
                    v-for="role in ROLES_IN_ORDER"
                        :key="role"
                        @click="toggleRole(role)"
                        :class="['role-card border-2 p-3 rounded-lg cursor-pointer relative border-gray-700',
                        { 'selected': selectedRoles.has(role), },
                        {'inherit': config.ROLES.townsfolk.includes(role)},
                        {'text-indigo-500': config.ROLES.outsiders.includes(role)},
                        {'text-yellow-600': config.ROLES.minions.includes(role)},
                        {'text-red-500': config.ROLES.demons.includes(role)}  
                        ]">{{ role }}</div>
                    <input type="checkbox" name="roles" :value="role" :checked="selectedRoles.has(role)" class="hidden">
                    <h4 class="font-bold text-center">{{ role }}</h4>
                    </div>
                </div>

                <!-- 步骤三：确认并开始 -->
                <div class="bg-gray-800 p-6 fixed bottom-0 left-0 right-0 z-20 shadow-2xl shadow-slate-600 border border-gray-700">
                    <h3 class="text-xl font-medium text-gray-200 mb-4">3. 确认配置</h3>
                    <div class="flex flex-wrap gap-4 justify-between items-center mb-4">
                        <div>
                            <p>已选角色数量: <span id="selected-count" class="font-bold text-2xl text-yellow-400">{{selectedRoles.size}}</span></p>
                            <p>需要选择数量: <span id="required-count" class="font-bold text-2xl text-indigo-400">{{playerCount}}</span></p>
                        </div>
                        <div class="flex flex-col">
                        <div class="flex flex-wrap gap-4">
                            <p>镇民: <span id="good-count" class="font-bold text-2xl text-green-400">{{townsfolkCount}}</span></p>
                            <p>外来: <span id="evil-count" class="font-bold text-2xl text-blue-400">{{outsiderCount}}</span></p>
                        </div>
                        <div class="flex flex-wrap gap-4">
                            <p>爪牙: <span id="minion-count" class="font-bold text-2xl text-yellow-400">{{minionCount}}</span></p>
                            <p>恶魔: <span id="demon-count" class="font-bold text-2xl text-red-400">{{demonCount}}</span></p>
                        </div>
                        </div>
                    </div>
                    <button id="submit-btn" type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed" 
                    :disabled="selectedRoles.size !== playerCount"
                    @click="submitConfig()">
                        {{!playerCount
                        ?"请输入玩家人数" 
                        : playerCount === selectedRoles.size 
                        ? '开始游戏' 
                        : (playerCount-selectedRoles.size)>0 
                        ? '请再选择'+Math.abs(playerCount-selectedRoles.size)+'个角色'
                        : '请删除'+Math.abs(playerCount-selectedRoles.size)+'个角色'}}
                    </button>
                    <p id="error-message" class="text-center text-red-500 mt-2 font-semibold"></p>
                </div>
            </form>
        </div>
    </body>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { socketService } from '@/services/socketService';
import * as config from '@/config/gameConfig'// 从配置文件导入

const role = ref('');
const ROLES_IN_ORDER = Object.keys(config.ROLE_DESCRIPTIONS);
const playerCount = ref(null);
const selectedRoles = ref(new Set());
const router = useRouter();
const minionCount = ref(0);
const townsfolkCount = ref(0);
const outsiderCount = ref(0);
const demonCount = ref(0);


const isConfigValid = computed(() => {
    return playerCount.value && selectedRoles.value.size === playerCount.value;
});

const errorMessage = computed(() => {
    if (!playerCount.value) return '请输入玩家人数';
    if (selectedRoles.value.size > playerCount.value) return '选择的角色过多';
    if (selectedRoles.value.size < playerCount.value) return `还需选择 ${playerCount.value - selectedRoles.value.size} 个角色`;
    return '';
});

// 当卡片被点击时，这个方法会被调用
const toggleRole = (role) => {
  // 我们只修改数据，不关心DOM如何变化
    console.log(config.BAD_ROLES);
    if (selectedRoles.value.has(role)) {
        selectedRoles.value.delete(role); // 如果已存在，则删除
        if (config.ROLES.townsfolk.includes(role)) townsfolkCount.value--;  
        if (config.ROLES.outsiders.includes(role)) outsiderCount.value--;  
        if (config.ROLES.minions.includes(role)) minionCount.value--;  
        if (config.ROLES.demons.includes(role)) demonCount.value--;  
    } else {
        selectedRoles.value.add(role);
        if (config.ROLES.townsfolk.includes(role)) townsfolkCount.value++;  
        if (config.ROLES.outsiders.includes(role)) outsiderCount.value++;  
        if (config.ROLES.minions.includes(role)) minionCount.value++;  
        if (config.ROLES.demons.includes(role)) demonCount.value++;  
    }
  // Vue 会自动侦测到 selectedRoles.value 的变化，并重新渲染上面模板中所有用到它的地方。
}

function submitConfig() {
    if (!isConfigValid.value) return;
    
    const config = {
        playerCount: playerCount.value,
        roles: Array.from(selectedRoles.value)
    };

    // 通过 socket 发送配置
    socketService.emit('game_setup', config);

    // 跳转到游戏面板
    router.push('/game-board');
}
</script>

<style scoped>
/* 复刻自原版HTML的样式 */
body {
    font-family: 'Inter', sans-serif;
}
.role-card { transition: all 0.2s ease-in-out; }
.role-card.selected {
    border-color: #4f46e5;
    background-color: #3730a3;
    transform: scale(1.05);
  /* color: white; */
}
.tooltip {
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.3s;
}
.has-tooltip:hover .tooltip {
    visibility: visible;
    opacity: 1;
}
</style>