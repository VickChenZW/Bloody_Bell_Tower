<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-900 p-4 font-sans text-white">
    <div class="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-2xl">
      <h1 class="mb-2 text-center text-3xl font-bold text-indigo-400">血染钟楼</h1>
      <h2 class="mb-8 text-center text-xl font-medium text-gray-300">暗流涌动 - 游戏助手</h2>

      <!-- 游戏模式选择 -->
      <div class="mb-6 flex rounded-lg bg-gray-700 p-1">
        <button
          @click="gameMode = 'random'"
          :class="['flex-1 rounded-md py-2 text-md font-semibold', { 'bg-indigo-600 text-white': gameMode === 'random' }]"
        >
          随机分配
        </button>
        <button
          @click="gameMode = 'manual'"
          :class="['flex-1 rounded-md py-2 text-md font-semibold', { 'bg-indigo-600 text-white': gameMode === 'manual' }]"
        >
          手动输入
        </button>
      </div>

      <!-- 动态表单容器 -->
      <div>
        <!-- 角色标签页 (玩家/说书人) -->
        <div class="mb-6">
          <div class="flex border-b border-gray-700">
            <button
              @click="userRole = 'player'"
              :class="['flex-1 border-b-2 py-3 text-lg font-semibold', userRole === 'player' ? 'border-indigo-500 text-indigo-100' : 'border-transparent text-gray-400']"
            >
              我是玩家
            </button>
            <button
              @click="userRole = 'storyteller'"
              :class="['flex-1 border-b-2 py-3 text-lg font-semibold', userRole === 'storyteller' ? 'border-rose-500 text-rose-100' : 'border-transparent text-gray-400']"
            >
              我是说书人
            </button>
          </div>
        </div>

        <!-- 玩家表单 -->
        <form v-if="userRole === 'player'" @submit.prevent="handleJoinAsPlayer" class="space-y-6">
          <div>
            <label for="player-username" class="mb-2 block text-sm font-medium text-gray-300">你的名字</label>
            <input type="text" id="player-username" v-model="playerForm.username" class="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white" placeholder="例如：比巴卜" required>
          </div>
          <div>
            <label for="player-number" class="mb-2 block text-sm font-medium text-gray-300">你的序号</label>
            <input type="number" id="player-number" v-model.number="playerForm.number" class="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white" placeholder="例如：5" required>
          </div>
          <!-- 手动模式下的身份选择 -->
          <div v-if="gameMode === 'manual'">
            <label for="role-manual" class="mb-2 block text-sm font-medium text-gray-300">你的身份</label>
            <select v-model="playerForm.role" id="role-manual" class="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white">
              <option 
                v-for="role in availableRoles" 
                :key="role" 
                :value="role"
                :class="role === '小恶魔' ?  'text-red-600' : 'inherit'"
                >
                {{ role }}
              </option>
            </select>
          </div>
            <p v-if="gameMode === 'random'" class="text-sm text-gray-400">你的身份将由说书人配置后随机分配。</p>
          <button type="submit" class="w-full rounded-lg bg-indigo-600 py-3 px-4 font-bold text-white hover:bg-indigo-700">
            {{ gameMode === 'manual' ? '进入游戏' : '加入等待队列' }}
          </button>
        </form>

        <!-- 说书人表单 -->
        <form v-if="userRole === 'storyteller'" @submit.prevent="handleJoinAsStoryteller" class="space-y-6">
          <div>
            <label for="storyteller-username" class="mb-2 block text-sm font-medium text-gray-300">说书人代号</label>
            <input type="text" id="storyteller-username" v-model="storytellerForm.username" class="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white" required>
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
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useSetupStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/auth';


// --- Reactive State ---
const gameMode = ref('random'); // 'random' or 'manual'
const userRole = ref('player'); // 'player' or 'storyteller'
const router = useRouter();
const setupStore = useSetupStore();
const authStore = useAuthStore()

const availableRoles = ref(['洗衣妇', '图书管理员', '调查员', '厨师', '共情者', '占卜师', '送葬者', '僧侣', '守鸦人', '贞洁者', '猎手', '士兵', '镇长', '管家', '陌客', '酒鬼', '圣徒', '投毒者', '红唇女郎', '间谍', '男爵', '小恶魔']);

const playerForm = reactive({
  username: '',
  number: null,
  role: availableRoles.value[0], // Default role
});

const storytellerForm = reactive({
  username: '说书人',
});

// --- Methods ---
const handleJoinAsPlayer = () => {
  if (!playerForm.username || playerForm.number === null) {
    alert('请填写你的名字和序号！');
    return;
  }
  
  const payload = {
    gameMode: gameMode.value,
    name: playerForm.username,
    number: playerForm.number,
    role: gameMode.value === 'manual' ? playerForm.role : null
  };

  // TODO: 向后端发送 'join_as_player' 事件，并附上 playerData
  setupStore.joinGame(payload)
  alert(`玩家 ${payload.name} (序号${payload.number}) 已加入！身份: ${playerData.role}`);
  
  // 跳转到玩家等待页面 (待开发)
  // router.push('/waiting-room');
};

const handleJoinAsStoryteller = () => {
  if (!storytellerForm.username) {
    alert('请输入说书人代号！');
    return;
  }

  const payload = {
    gameMode: gameMode.value,
    name: storytellerForm.username,
    role: 'storyteller' // 明确角色是说书人
  };
  
  setupStore.joinGame(payload)

  // TODO: 向后端发送 'join_as_storyteller' 事件
  setupStore.setStoryteller(storytellerForm.username);
  alert(`说书人 ${storytellerForm.username} 已登录，即将进入设置页面。`);

  // 跳转到游戏设置页面
  router.push('/setup');
};
</script>
