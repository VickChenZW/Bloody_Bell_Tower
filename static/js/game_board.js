// static/js/game_board.js
console.log("load js successful")

// --- 全局变量和初始化 ---
const socket = io();
// IS_STORYTELLER 和 CURRENT_USERNAME 将从 HTML 中获取
let GAME_STATE = {};
let selectedPlayerForModal = null;
updata_help_list()

// --- DOM 元素获取 ---
const dom = {
    logBox: document.getElementById('log-box'),
    playerModal: document.getElementById('player-modal'),
    systemMessageModal: document.getElementById('system-message-modal'),
    systemMessageContent: document.getElementById('system-message-content'),
    systemMessageCloseBtn: document.getElementById('system-message-close-btn'),
    selectMessageModal: document.getElementById('select-message-modal'),
};

// --- 通用函数 ---
function showSystemMessage(message) {
    dom.systemMessageContent.textContent = message;
    dom.systemMessageModal.classList.remove('hidden');
}

// 发送投票结果（玩家）
function sendVote(vote) {
    socket.emit('player_action', { action: 'player_vote', vote: vote });
    dom.selectMessageModal.classList.add('hidden');
}

// --- 主UI更新函数 ---
function updateUI(state) {
    console.log("Updating UI with new state:", state);
    GAME_STATE = state; // 更新全局状态

    updateLogs(state.action_logs);

    if (IS_STORYTELLER) {
        updateStorytellerView(state);
    } else {
        updatePlayerView(state);
    }
}

// --- SocketIO 事件监听 ---
socket.on('connect', () => console.log('成功连接到服务器!'));
socket.on('disconnect', () => showSystemMessage('与服务器断开连接，请刷新页面重试。'));
socket.on('update_game_state', updateUI); // 核心监听器

// 强制重置信号
socket.on('force_reload', () => {
    showSystemMessage('说书人已重置游戏，页面将刷新。');
    setTimeout(() => window.location.reload(), 2000);
});

// 唤醒操作信号（玩家）
socket.on('wake_up', (data) => {
    if (IS_STORYTELLER) return;
    // 尝试震动  不起效果（ios禁用）
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    showSystemMessage(`说书人正在唤醒你 (${data.role}) 行动！`);
    renderPlayerActionArea(data.role);
});

// 收到系统信息信号
socket.on('receive_system_message', (data) => {
    showSystemMessage(data.message);
    if (IS_STORYTELLER) {
        if(data.type === 'player_action') {
            handlePlayerActionFeedback(data);
            // const controls = document.getElementById('st-action-controls');
            // controls.innerHTML = `<p>玩家已完成操作！进行下一步</p>`;
        }
    }
    if (!IS_STORYTELLER) {
        if (GAME_STATE.self_info && GAME_STATE.self_info.role === '间谍' && data.message.includes('日志摘要')) {
            const formattedMessage = data.message.replace(/\n/g, '<br>');
            const newLogEntry = document.createElement('div');
            newLogEntry.className = 'mb-1 text-cyan-300 whitespace-pre-wrap';
            newLogEntry.innerHTML = formattedMessage;
            dom.logBox.prepend(newLogEntry);
        }
        if (data.type === 'info') {
             const submitBtn = document.getElementById('submit-action-btn');
             const playerActionArea = document.getElementById('player-action-area');
             if (playerActionArea && !playerActionArea.classList.contains('hidden') && submitBtn && submitBtn.disabled) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
             }
        }
    }
});

// 开始投票信号（玩家）
socket.on('initiate_vote', (data) => {
    if (IS_STORYTELLER) return;
    const selectMessageContent = document.getElementById('select-message-content');
    selectMessageContent.textContent = `对 ${data.target} 发起处决投票，请选择：`;
    
    document.getElementById('select-message-ok-btn').onclick = () => sendVote('yes');
    document.getElementById('select-message-refuse-btn').onclick = () => sendVote('no');
    document.getElementById('select-message-null-btn').onclick = () => sendVote('null');
    
    dom.selectMessageModal.classList.remove('hidden');
});

// 分配身份
socket.on('role_assigned', (data) => {
    if (IS_STORYTELLER) return;
    // 更新前端的身份信息
    document.getElementById('current-role').textContent = data.role;
    document.getElementById('player-waiting-area').classList.add('hidden');
    document.getElementById('player-game-area').classList.remove('hidden');
    showSystemMessage(`你的身份是: 【${data.role}】\n\n${data.description}`);
});


// --- UI 渲染函数 ---
// 游戏日志更新
function updateLogs(logs) {
    if (!logs) {
        dom.logBox.innerHTML = '';
        return;
    }
    dom.logBox.innerHTML = logs.map(log => {
        const message = (typeof log === 'object' && log !== null) ? log.message : log;
        return `<div class="mb-1 text-gray-300">${message}</div>`
    }).join('');
}

//  更新说书人窗口
function updateStorytellerView(state) {
    if (state.game_mode === 'random' && state.game_phase === 'not_started') {
        document.getElementById('st-game-setup-info').classList.remove('hidden');
        document.getElementById('st-game-progress-info').classList.add('hidden');
        const playerCount = Object.keys(state.players).length;
        const totalCount = state.total_player_count;
        document.getElementById('player-join-status').textContent = `${playerCount}/${totalCount}`;
        const startGameBtn = document.getElementById('start-game-btn');
        startGameBtn.disabled = !state.is_game_ready_to_start;
    } else {
        document.getElementById('st-game-setup-info').classList.add('hidden');
        document.getElementById('st-game-progress-info').classList.remove('hidden');
        updatePhase(state);
        updateVoteButton(state.current_vote);
    }
    updatePlayerCircle(state.players, state.current_vote);
}

// 更新玩家窗口
function updatePlayerView(state) {
    if (state.game_mode === 'random' && state.game_phase === 'not_started') {
        document.getElementById('player-waiting-area').classList.remove('hidden');
        document.getElementById('player-game-area').classList.add('hidden');
    } else {
        document.getElementById('player-waiting-area').classList.add('hidden');
        document.getElementById('player-game-area').classList.remove('hidden');
    }
   

    if (!state.self_info) return;

    const playerPhaseDisplay = document.getElementById('player-game-phase-display');
    const playerNightNumDisplay = document.getElementById('player-night-number-display');
    const selfInfoCard = document.getElementById('self-info-card');
    const playerList = document.getElementById('player-list');

    const phaseMap = {
        'not_started': { text: '未开始', color: 'text-gray-400' },
        'night': { text: '夜晚', color: 'text-blue-400' },
        'day': { text: '白天', color: 'text-yellow-400' },
    };
    playerPhaseDisplay.textContent = phaseMap[state.game_phase].text;
    playerPhaseDisplay.className = `font-bold text-xl ${phaseMap[state.game_phase].color}`;
    playerNightNumDisplay.textContent = (state.game_phase === 'night' && state.night_number > 0) ? `(第${state.night_number}晚)` : '';

    const { number, username, role, status_display } = state.self_info;
    let statusClass = 'text-green-400';
    // let player_status_display = status_display;
    // if (status_display === '仅剩一票') player_status_display = '死亡';
    if (status_display === '死亡'|| status_display === '仅剩一票') statusClass = 'text-red-500';
    // if (status_display === '仅剩一次投票') statusClass = 'text-indigo-400';
    // console.log(player_status_display)
    selfInfoCard.innerHTML = `
        <p><strong>序号:</strong> ${number}</p>
        <p><strong>名字:</strong> ${username}</p>
        <p><strong>身份:</strong> ${role} <span class="role-help-icon" onclick="showRoleHelp('${role}')">(?)</span></p>
        <p><strong>状态:</strong> <span class="font-bold ${statusClass}">${status_display}</span></p>
    `;
    
    if (state.players && playerList) {
        playerList.innerHTML = '';
        const sortedPlayers = state.players.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        sortedPlayers.forEach(player => {
            let statusClass = 'bg-green-500';
            let player_status_display = player.status_display;
            if (player.status_display === '仅剩一票') player_status_display = '死亡';
            if (player.status_display === '死亡' || player.status_display === '仅剩一票') statusClass = 'bg-red-500';
            // if (player.status_display === '仅剩一次投票') statusClass = 'bg-purple-600';
            playerList.innerHTML += `
                <div class="p-3 rounded-lg bg-gray-700 text-center">
                    <div class="text-xl font-bold">${player.number}</div>
                    <div class="text-md truncate">${player.username}</div>
                    <div class="text-xs font-semibold uppercase px-2 py-1 rounded-full mt-2 ${statusClass}">${player_status_display}</div>
                </div>`;
        });
    }
}

// 更新轮次
function updatePhase(state) {
    const phaseDisplay = document.getElementById('game-phase-display');
    const nightNumDisplay = document.getElementById('night-number-display');
    const changePhaseBtn = document.getElementById('change-phase-btn');
    const dayActions = document.getElementById('day-actions');
    const nightActions = document.getElementById('night-actions');

    const phaseMap = {
        'not_started': { text: '未开始', btnText: '开始首夜' },
        'night': { text: '夜晚', btnText: '进入白天' },
        'day': { text: '白天', btnText: '进入夜晚' },
    };

    phaseDisplay.textContent = phaseMap[state.game_phase].text;
    nightNumDisplay.textContent = (state.game_phase === 'night' && state.night_number > 0) ? `(第${state.night_number}晚)` : '';
    if (changePhaseBtn) changePhaseBtn.textContent = phaseMap[state.game_phase].btnText;

    if (state.game_phase === 'day') {
        dayActions.classList.remove('hidden');
        nightActions.classList.add('hidden');
    } else {
        dayActions.classList.add('hidden');
        nightActions.classList.remove('hidden');
        if (state.game_phase === 'night') {
            updateNightActionList(state);
        }
    }
}

// 更新玩家圆盘（说书人）
function updatePlayerCircle(players, voteInfo) {
    const playerCircle = document.getElementById('player-circle');
    if (!playerCircle || !players) return;
    playerCircle.innerHTML = '';
    
    const playerArray = Object.values(players).sort((a,b) => parseInt(a.number) - parseInt(b.number));
    const count = playerArray.length;
    if (count === 0) return;

    const container = document.getElementById('player-circle-container');
    const radius = container.offsetWidth / 2 * 0.8; 
    const centerX = container.offsetWidth / 2;
    const centerY = container.offsetHeight / 2;
    
    const nodeSize = Math.max(65, container.offsetWidth / 6);

    const voteMap = { yes: '👍', no: '👎', null: '🤷' };

    playerArray.forEach((player, i) => {
        const angle = (360 / count * i - 90) * (Math.PI / 180);   
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const effectsClasses = (player.effects || []).join(' ');
        const impClass = player.is_imp ? 'is_imp' : '';
        const node = document.createElement('div');
        node.className = `player-node bg-gray-700 border-2 border-gray-500 rounded-lg ${player.status} ${effectsClasses} ${impClass}`;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.width = `${nodeSize}px`;
        node.style.height = `${nodeSize}px`;
        
        let statusIcon = '';
        if (player.status === 'dead' || player.status === 'executed') statusIcon = '💀';
        if (player.status === 'final_vote') statusIcon = '🗳️';

        let voteEmoji = '';
        if (voteInfo && voteInfo.votes && voteInfo.votes[player.username]) {
            voteEmoji = voteMap[voteInfo.votes[player.username]];
        }

        node.innerHTML = `
            <div class="effect-icons text-xl">
                <span class="imp-icon">😈</span>
                <span class="effect-poison">🤢</span>
                <span class="effect-is_drunkard">🍺</span>
                <span class="effect-is_recluse">👾</span>
                <span class="effect-is_protected">🛡️</span>
            </div>
            <!-- 新增：显示投票表情的元素 -->
            <span class="vote-emoji absolute -top-2 -right-2 text-2xl" style="display: inline;">${voteEmoji}</span>
            <span class="text-xl font-bold">${player.number}</span>
            <span class="text-sm truncate w-20">${player.username}</span>
            <span class="text-xs text-indigo-300">${player.role}</span>
            <span class="status-icon text-red-500 font-bold">${statusIcon}</span>
        `;
        node.onclick = () => openModal(player.username);
        playerCircle.appendChild(node);
    });
}

// 更新夜间行动列表（说书人）
function updateNightActionList(state) {
    const nightActionList = document.getElementById('night-action-list');
    if (!nightActionList) return;
    const nightOrder = (state.night_number <= 1) ? state.first_night_order : state.other_nights_order;
    const completedActions = state.night_actions_completed || [];
    
    nightActionList.innerHTML = '';
    nightOrder.forEach((roleAction) => {
        const isCompleted = completedActions.includes(roleAction);
        const playerForAction = roleAction === '小恶魔' 
            ? Object.values(state.players).find(p => p.is_imp && p.status === 'alive')
            : Object.values(state.players).find(p => p.role === roleAction && p.status === 'alive');
        
        const li = document.createElement('li');
        li.className = `flex justify-between items-center bg-gray-700 p-2 rounded-lg ${isCompleted ? 'action-completed' : ''}`;
        
        if (roleAction === "恶魔爪牙信息") {
            li.innerHTML = `<span>${roleAction}</span>`;
        } else if (playerForAction) {
            li.innerHTML = `<span>${roleAction} (${playerForAction.number}号)</span>`;
        } else {
            li.innerHTML = `<span>${roleAction} (无存活玩家)</span>`;
            li.classList.add('hidden');
        }

        if (roleAction === "恶魔爪牙信息" || playerForAction) {
            const buttonContainer = document.createElement('div');
            const wakeBtn = document.createElement('button');
            wakeBtn.textContent = '操作';
            wakeBtn.className = 'wake-btn bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold py-1 px-2 rounded';
            
            wakeBtn.onclick = (e) => {
                e.stopPropagation();
                const targetUsername = playerForAction ? playerForAction.username : null;
                renderStorytellerActionArea(roleAction, targetUsername);
            };
            buttonContainer.appendChild(wakeBtn);
            li.appendChild(buttonContainer);
        }
        nightActionList.appendChild(li);
    });
}

/* */
// 控制投票按钮
function updateVoteButton(voteInfo) {
    const btn = document.getElementById('st-vote-status-btn');
    if (!btn) return;

    if (!voteInfo) {
        btn.classList.add('hidden');
        return;
    }

    btn.classList.remove('hidden');
    btn.disabled = false;
    btn.onclick = null; // 清除旧的点击事件

    if (voteInfo.status === 'finished') {
        btn.textContent = '投票结束 (点击清除)';
        btn.classList.remove('bg-cyan-700');
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
        btn.onclick = () => {
            socket.emit('storyteller_action', { action: 'clear_vote_display' });
        };
    } else { // 'in_progress'
        btn.textContent = `对 ${voteInfo.target} 投票中，点击重置投票`;
        btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        btn.classList.add('bg-cyan-700');
        btn.onclick = () => {
            socket.emit('storyteller_action', {action: 'reset_vote'})
        }
    }
}

// 显示角色说明（玩家）
function showRoleHelp(role) {
    const description = GAME_STATE.role_descriptions[role] || "暂无该角色的详细信息。";
    showSystemMessage(`【${role}】\n\n${description}`);
}

// --全局角色说明
function updata_help_list(){
    const roles = ['洗衣妇', '图书管理员', '调查员', '厨师', '共情者', '占卜师', '送葬者', '僧侣', '守鸦人', '贞洁者',
        '猎手', '士兵', '镇长', '管家', '陌客', '酒鬼', '圣徒', '投毒者', '红唇女郎', '间谍', '男爵', '小恶魔'];
    const roleSelect = document.getElementById('help_select');

    for (let i = 0; i< roles.length; i++){
        const option = document.createElement('option');
        option.value = roles[i];
        option.textContent = roles[i];
        roleSelect.appendChild(option);
    }
}

function getHelp(){
    const role = document.getElementById('help_select').value;
    const description = GAME_STATE.role_descriptions[role] || "暂无该角色的详细信息。";
    showSystemMessage(`【${role}】\n\n${description}`);
}

// 渲染说书人行动区域（说书人
function renderStorytellerActionArea(role, targetUsername) {
    const area = document.getElementById('st-dynamic-action-area');
    const title = document.getElementById('st-action-title');
    const controls = document.getElementById('st-action-controls');
    const submitBtn = document.getElementById('st-action-submit-btn');
    
    title.textContent = `操作: ${role}` + (targetUsername ? ` (${targetUsername})` : '');
    controls.innerHTML = '';
    area.classList.remove('hidden');
    submitBtn.classList.remove('hidden');

    const alivePlayers = Object.values(GAME_STATE.players).filter(p => p.status === 'alive');
    const allPlayers = Object.values(GAME_STATE.players);
    const playerOptions = alivePlayers.map(p => `<option value="${p.username}">${p.number}号-${p.username}</option>`).join('');
    const allPlayerOptions = allPlayers.map(p => `<option value="${p.username}">${p.number}号-${p.username} (${p.status})</option>`).join('');
    const allRoleOptions = GAME_STATE.roles.map(r => `<option value="${r}">${r}</option>`).join('');

    switch(role) {
        case '间谍':
            controls.innerHTML = `<p>点击下方按钮，将当夜的行动日志（按时间顺序）发送给间谍 (${targetUsername})。</p>`;
            submitBtn.textContent = '发送当夜日志';
            submitBtn.onclick = () => {
                socket.emit('storyteller_action', { action: 'send_log_to_spy', target_username: targetUsername });
                area.classList.add('hidden');
            };
            break;
        case '恶魔爪牙信息':
            const inPlayRoles = new Set(Object.values(GAME_STATE.players).map(p => p.role));
            const notInPlayGoodRoles = GAME_STATE.good_roles.filter(r => !inPlayRoles.has(r));
            const bluffOptions = notInPlayGoodRoles.map(r => `<label class="flex items-center gap-2"><input type="checkbox" name="bluff_roles" value="${r}" class="form-checkbox h-5 w-5 rounded bg-gray-800 border-gray-600 text-indigo-600"><span>${r}</span></label>`).join('');
            controls.innerHTML = `<p>请选择3个不在场的善良角色作为伪报信息:</p><div class="grid grid-cols-2 gap-2">${bluffOptions}</div>`;
            submitBtn.textContent = '确认并发送给恶魔阵营';
            submitBtn.onclick = () => {
                const selectedBluffs = Array.from(document.querySelectorAll('input[name="bluff_roles"]:checked')).map(cb => cb.value);
                if (selectedBluffs.length !== 3) { showSystemMessage('请正好选择3个角色。'); return; }
                socket.emit('storyteller_action', { action: 'evil_team_setup', bluff_roles: selectedBluffs });
                area.classList.add('hidden');
            };
            break;
        case '洗衣妇': case '图书管理员': case '调查员':
            socket.emit('storyteller_action', { action: 'wake_player', target_username: targetUsername, role_action: role });
            controls.innerHTML = `<p>选择两名玩家和一个角色告知目标:</p>
                <select id="st-p1" class="w-full bg-gray-600 p-2 rounded">${allPlayerOptions}</select>
                <select id="st-p2" class="w-full bg-gray-600 p-2 rounded">${allPlayerOptions}</select>
                <select id="st-role" class="w-full bg-gray-600 p-2 rounded">${allRoleOptions}</select>`;
            submitBtn.textContent = '发送信息';
            submitBtn.onclick = () => {
                const p1 = document.getElementById('st-p1').value;
                const p2 = document.getElementById('st-p2').value;
                const r = document.getElementById('st-role').value;
                const message = `说书人提示: 在 ${p1} 和 ${p2} 中, 有一名 ${r}。`;
                socket.emit('storyteller_action', { action: 'info_to_player', target_username: targetUsername, message: message, role_action: role });
                area.classList.add('hidden');
            };
            break;
        case '厨师': case '共情者':
            socket.emit('storyteller_action', { action: 'wake_player', target_username: targetUsername, role_action: role });
            controls.innerHTML = `<p>请输入要展示的数字:</p><input type="number" id="st-number-info" class="w-full bg-gray-600 p-2 rounded" min="0" value="0">`;
            submitBtn.textContent = '发送数字';
            submitBtn.onclick = () => {
                const num = document.getElementById('st-number-info').value;
                const message = `说书人向你展示了数字: ${num}`;
                socket.emit('storyteller_action', { action: 'info_to_player', target_username: targetUsername, message: message, role_action: role });
                area.classList.add('hidden');
            };
            break;
        case '占卜师':
            socket.emit('storyteller_action', { action: 'wake_player', target_username: targetUsername, role_action: role });
            controls.innerHTML = `<p id="st-ft-prompt">已唤醒玩家，等待其选择目标...</p>`;         
            submitBtn.classList.add('hidden');
            break;
        case '送葬者':
            controls.innerHTML = `<p>选择一个角色名告知目标:</p><select id="st-role" class="w-full bg-gray-600 p-2 rounded">${allRoleOptions}</select>`;
            submitBtn.textContent = '发送信息';
            submitBtn.onclick = () => {
                const r = document.getElementById('st-role').value;
                const message = `说书人展示的角色是: ${r}`;
                socket.emit('storyteller_action', { action: 'info_to_player', target_username: targetUsername, message: message, role_action: role });
                area.classList.add('hidden');
            };
            break;
        case '守鸦人':
            socket.emit('storyteller_action', { action: 'wake_player', target_username: targetUsername, role_action: role });
            controls.innerHTML = `<p id="st-ft-prompt">已唤醒玩家，等待其选择目标...</p>`;         
            submitBtn.classList.add('hidden');
            break;
        default:
            socket.emit('storyteller_action', { action: 'wake_player', target_username: targetUsername, role_action: role });
            controls.innerHTML = `<p>已唤醒玩家 ${targetUsername}，等待其操作...</p>`;
            submitBtn.classList.add('hidden');
    }
}

function handlePlayerActionFeedback(data) {
    const role = data.from_role
    let targetUsername;
    const controls = document.getElementById('st-action-controls');
    const prompt = document.getElementById('st-ft-prompt');
    const submitBtn = document.getElementById('st-action-submit-btn');
    switch(role){
    case "占卜师":
        targetUsername = Object.values(GAME_STATE.players).find(p => p.role === '占卜师').username;    
        prompt.innerHTML = `玩家 (${targetUsername}) 选择了: <br> <span class="text-cyan-400">${data.targets.join(' 和 ')}</span> <br>请回复:`;
        controls.innerHTML += `<div class="flex gap-4"><button id="st-yes" class="flex-1 bg-green-600 p-2 rounded">是</button><button id="st-no" class="flex-1 bg-red-600 p-2 rounded">否</button></div>`;
        document.getElementById('st-yes').onclick = () => sendFortuneTellerResult('是', targetUsername);
        document.getElementById('st-no').onclick = () => sendFortuneTellerResult('否', targetUsername);
        function sendFortuneTellerResult(result, username) {
            socket.emit('storyteller_action', { action: 'fortune_teller_result', target_username: username, result: result });
            document.getElementById('st-dynamic-action-area').classList.add('hidden');
        };
        break;
    case "守鸦人":
        targetUsername = Object.values(GAME_STATE.players).find(p => p.role === '守鸦人').username;
        prompt.innerHTML = `玩家 (${targetUsername}) 选择了: <br> <span class="text-cyan-400">${data.targets.join(' 和 ')}</span>`;
        const allRoleOptions = GAME_STATE.roles.map(r => `<option value="${r}">${r}</option>`).join('');
        controls.innerHTML = `<select id="st-role" class="w-full bg-gray-600 p-2 rounded">${allRoleOptions}</select>`;
        submitBtn.classList.remove("hidden");
        submitBtn.textContent = '发送信息';
        submitBtn.onclick = () => {
            const r = document.getElementById('st-role').value;
            const message = `说书人展示的角色是: ${r}`;
            socket.emit('storyteller_action', { action: 'info_to_player', target_username: targetUsername, message: message, role_action: role });
            area.classList.add('hidden');
        };
        break;
    }

}

// 渲染玩家行动区域（玩家）
function renderPlayerActionArea(role) {
    const area = document.getElementById('player-action-area');
    const prompt = document.getElementById('action-prompt');
    const controls = document.getElementById('player-choice-controls');
    const submitBtn = document.getElementById('submit-action-btn');
    
    area.classList.remove('hidden');
    prompt.textContent = `你的回合: ${role}`;
    controls.innerHTML = '';
    document.getElementById('storyteller-info-box').classList.add('hidden');
    submitBtn.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');

    const alivePlayers = Object.values(GAME_STATE.players || {}).filter(p => p.username !== CURRENT_USERNAME && p.status === 'alive');
    const allPlayers = Object.values(GAME_STATE.players || {}).filter(p => p.username !== CURRENT_USERNAME);
    const playerOptions = alivePlayers.map(p => `<option value="${p.username}">${p.number}号-${p.username}</option>`).join('');
    const allPlayerOptions = allPlayers.map(p => `<option value="${p.username}">${p.number}号-${p.username} (${p.status_display})</option>`).join('');

    switch(role) {
        case '占卜师':
            controls.innerHTML = `<p>请选择两名玩家进行占卜:</p>
                <select id="pl-p1" class="w-full bg-gray-600 p-2 rounded">${allPlayerOptions}</select>
                <select id="pl-p2" class="w-full bg-gray-600 p-2 rounded">${allPlayerOptions}</select>`;
            submitBtn.textContent = '确认选择';
            submitBtn.onclick = () => {
                const p1 = document.getElementById('pl-p1').value;
                const p2 = document.getElementById('pl-p2').value;
                if (p1 === p2) { showSystemMessage("不能选择同一个玩家。"); return; }
                socket.emit('player_action', { action: 'player_choice', targets: [p1, p2], role_action: role });
                area.classList.add('hidden');
            };
            break;
        case '小恶魔':
            const selfOption = `<option value="${CURRENT_USERNAME}">${GAME_STATE.self_info.number}号-${CURRENT_USERNAME} (自己)</option>`;
            controls.innerHTML = `<p>请选择一名玩家作为目标:</p><select id="pl-p1" class="w-full bg-gray-600 p-2 rounded">${playerOptions}${selfOption}</select>`;
            submitBtn.textContent = '确认选择';
            submitBtn.onclick = () => {
                socket.emit('player_action', { action: 'player_choice', targets: [document.getElementById('pl-p1').value], role_action: role });
                area.classList.add('hidden');
            };
            break;
        case '僧侣': case '守鸦人': case '投毒者': case '管家':
            controls.innerHTML = `<p>请选择一名玩家作为目标:</p><select id="pl-p1" class="w-full bg-gray-600 p-2 rounded">${playerOptions}</select>`;
            submitBtn.textContent = '确认选择';
            submitBtn.onclick = () => {
                socket.emit('player_action', { action: 'player_choice', targets: [document.getElementById('pl-p1').value], role_action: role });
                area.classList.add('hidden');
            };
            break;
        default:
            controls.innerHTML = `<p>请等待说书人的信息。</p>`;
            submitBtn.textContent = '我已收到信息';
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            submitBtn.onclick = () => {
                socket.emit('player_action', { action: 'player_choice', role_action: role });
                area.classList.add('hidden');
            };
            break;
    }
}

// --- 事件绑定 ---
// 关闭系统信息框
dom.systemMessageCloseBtn.onclick = () => dom.systemMessageModal.classList.add('hidden');

if (IS_STORYTELLER) {
    const startGameBtn = document.getElementById('start-game-btn');
    if(startGameBtn) startGameBtn.onclick = () => {
        socket.emit('storyteller_action', { action: 'start_game' });
        console.log('开始游戏')
    }
    document.getElementById('change-phase-btn').onclick = () => socket.emit('storyteller_action', { action: 'change_phase' });
    document.getElementById('modal-initiate-vote-btn').onclick = () => {
        if (selectedPlayerForModal) {
            socket.emit('storyteller_action', { action: 'initiate_vote', target_username: selectedPlayerForModal });
            closeModal();
        }
    };
    document.getElementById('modal-kill-btn').onclick = () => updatePlayerStatus('dead');
    // document.getElementById('modal-execute-btn').onclick = () => updatePlayerStatus('executed');
    document.getElementById('modal-revive-btn').onclick = () => updatePlayerStatus('alive');
    document.getElementById('modal-poison-btn').onclick = () => togglePlayerEffect('poisoned');
    // document.getElementById('modal-drunk-btn').onclick = () => togglePlayerEffect('drunk');
    document.getElementById('modal-final-vote-btn').onclick = () => updatePlayerStatus('final_vote');
    document.getElementById('modal-is-drunkard-btn').onclick = () => togglePlayerEffect('is_drunkard');
    document.getElementById('modal-is-recluse-btn').onclick = () => togglePlayerEffect('is_recluse');
    document.getElementById('modal-is-protected-btn').onclick = () => togglePlayerEffect('is_protected');
    document.getElementById('modal-set-imp-btn').onclick = () => {
        if(selectedPlayerForModal) {
            socket.emit('storyteller_action', { action: 'set_imp', target_username: selectedPlayerForModal });
            closeModal();
        }
    };
} 

// --- 模态框函数 ---
function openModal(username) {
    selectedPlayerForModal = username;
    document.getElementById('modal-title').textContent = `操作玩家: ${username}`;
    
    const voteBtn = document.getElementById('modal-initiate-vote-btn');
    const voteHr = document.getElementById('vote-hr');
    if (GAME_STATE.game_phase === 'day' && !GAME_STATE.current_vote && GAME_STATE.players[username].status === 'alive') {
        voteBtn.classList.remove('hidden');
        voteHr.classList.remove('hidden');
    } else {
        voteBtn.classList.add('hidden');
        voteHr.classList.add('hidden');
    }

    dom.playerModal.classList.remove('hidden');
}
function closeModal() {
    dom.playerModal.classList.add('hidden');
    selectedPlayerForModal = null;
}
function updatePlayerStatus(status) {
    if (selectedPlayerForModal) {
        socket.emit('storyteller_action', { action: 'update_player_status', target_username: selectedPlayerForModal, status: status });
        closeModal();
    }
}
function togglePlayerEffect(effect) {
     if (selectedPlayerForModal) {
        socket.emit('storyteller_action', { action: 'toggle_player_effect', target_username: selectedPlayerForModal, effect: effect });
        closeModal();
    }
}

window.addEventListener('resize', () => {
    if (IS_STORYTELLER && GAME_STATE.players) {
        updatePlayerCircle(GAME_STATE.players);
    }
});
