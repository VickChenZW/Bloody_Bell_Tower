<template>
  <body class="bg-gray-900 text-white pb-48">
    <div class="container mx-auto p-4 sm:p-8 max-w-4xl">
        <h1 class="text-3xl font-bold text-center text-indigo-400 mb-8">配置新游戏 (随机分配模式)</h1>
        <form action="/setup_game" method="POST">
            <!-- 步骤一：设置玩家人数 -->
            <div class="bg-gray-800 p-6 rounded-xl mb-8">
                <label for="player_count" class="block text-xl font-medium text-gray-200 mb-3">1. 设置总玩家人数</label>
                <input type="number" id="player_count" name="player_count" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 text-lg" placeholder="例如：10" required min="2">
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
                    { 'selected': selectedRoles.has(role) }
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
                        <p>需要选择数量: <span id="required-count" class="font-bold text-2xl text-indigo-400">0</span></p>
                    </div>
                    <div class="text-right">
                        <p>善良: <span id="good-count" class="font-bold text-green-400">0</span></p>
                        <p>邪恶: <span id="evil-count" class="font-bold text-red-400">0</span></p>
                    </div>
                </div>
                <button id="submit-btn" type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed" disabled>
                    创建游戏
                </button>
                <p id="error-message" class="text-center text-red-500 mt-2 font-semibold"></p>
            </div>
        </form>
    </div>
  </body>
</template>
<script setup>
import { ref } from 'vue';
const ROLES_IN_ORDER = [
            '洗衣妇', '图书管理员', '调查员', '厨师', '共情者', '占卜师', '送葬者', '僧侣', '守鸦人', '贞洁者',
            '猎手', '士兵', '镇长', '管家', '陌客', '酒鬼', '圣徒', '投毒者', '红唇女郎', '间谍', '男爵', '小恶魔'];

const selectedRoles = ref(new Set());

// --- 方法 ---
// 当卡片被点击时，这个方法会被调用
const toggleRole = (role) => {
  // 我们只修改数据，不关心DOM如何变化
  if (selectedRoles.value.has(role)) {
    selectedRoles.value.delete(role); // 如果已存在，则删除
  } else {
    selectedRoles.value.add(role);    // 如果不存在，则添加
  }
  // Vue 会自动侦测到 selectedRoles.value 的变化，并重新渲染上面模板中所有用到它的地方。
}
</script>
<style scoped>
/* 复刻自原版HTML的样式 */
.role-card { transition: all 0.2s ease-in-out; }
.role-card.selected {
  border-color: #4f46e5;
  background-color: #3730a3;
  transform: scale(1.05);
  color: white;
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