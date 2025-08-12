# -*- coding: utf-8 -*-
# from flask_socketio import emit
from scripts.game_state import set_game_state_in_redis, publish_state_update, publish_private_message


"""
这个文件包含了所有的游戏行为逻辑函数。
这些函数负责修改 game_state。
新增使用redis 缓存
"""


# --- 辅助函数 ---

def add_log(current_state,message, relevant_users):
    log_entry = {
        "message": message,
        "to": relevant_users,
        "night": current_state['night_number'],
        "phase": current_state['game_phase']
    }
    current_state['action_logs'].insert(0, log_entry)
    current_state['action_logs'] = current_state['action_logs'][:100]


def get_player_specific_state(current_state:dict, username):
    player_info = current_state['players'].get(username)
    if not player_info: return {}

    visible_logs = [log['message'] for log in current_state['action_logs'] if
                    log['to'] == 'all' or (isinstance(log['to'], list) and username in log['to'])]

    simplified_players = []
    for p_data in current_state['players'].values():
        public_data = {"username": p_data['username'], "number": p_data['number'], "status": p_data['status']}
        status_map = {'alive': '存活', 'dead': '死亡', 'executed': '死亡', 'final_vote': '仅剩一票'}
        public_data['status_display'] = status_map.get(p_data['status'], '存活')
        simplified_players.append(public_data)

    simplified_self_info = player_info.copy()
    status_map = {'alive': '存活', 'dead': '死亡', 'executed': '死亡', 'final_vote': '仅剩一票'}
    simplified_self_info['status_display'] = status_map.get(player_info['status'], '存活')
    if 'effects' in simplified_self_info: del simplified_self_info['effects']
    simplified_self_info['acting_role'] = '小恶魔' if simplified_self_info.get('is_imp') else simplified_self_info[
        'role']

    full_player_state = current_state.copy()
    full_player_state['players'] = simplified_players
    full_player_state['self_info'] = simplified_self_info
    full_player_state['action_logs'] = visible_logs

    return full_player_state


# def broadcast_all():
#     if game_state['storyteller_sid']:
#         # socketio.emit('update_game_state', game_state, to=game_state['storyteller_sid'])
#         set_game_state_in_redis(game_state)
#         publish_game_state(game_state)
#     for username, player_data in game_state['players'].items():
#         if player_data.get('sid'):
#             player_state = get_player_specific_state(username)
#             # socketio.emit('update_game_state', player_state, to=player_data['sid'])
#             publish_game_state(player_state)



# --- 说书人行为处理器 ---

# 新增：开始游戏并发牌 (随机模式)
def handle_start_game(detail:dict, user_id:str, current_state: dict):

    update_state = current_state.copy()
    if update_state['game_mode'] != 'random' or not update_state['is_game_ready_to_start']:
        return

    # 分配角色
    roles = update_state['roles_to_assign']
    player_list = list(update_state['players'].keys())

    for i, username in enumerate(player_list):
        role = roles[i]
        update_state['players'][username]['role'] = role
        update_state['players'][username]['is_evil'] = role in update_state['bad_roles']
        update_state['players'][username]['is_imp'] = role == '小恶魔'
        update_state['assigned_roles'][username] = role

        # 向每个玩家发送他们的角色信息
        # player_sid = current_state['players'][username].get('sid')
        # if player_sid:
        #     socketio.emit('role_assigned', {
        #         'role': role,
        #         'description': game_state['role_descriptions'].get(role, '暂无描述。')
        #     }, to=player_sid)
                    # 2. 【关键】调用辅助函数，发布一条私信指令给这个玩家
        publish_private_message(
            target_user_id=username,
            event_name='role_assigned', # 前端将监听这个事件
            payload={
                'role': role,
                'description': updated_state.get('role_descriptions', {}).get(role, '暂无描述。')
            }
        )
    add_log(current_state,"游戏开始！角色已分配。", "all")
    # 游戏开始后，直接进入首夜
    handle_change_phase(current_state=update_state)



# 更新轮次
def handle_change_phase(detail:dict, user_id:str, current_state: dict):
    current_phase = current_state.get['game_phase']

    update_state = current_state.copy()
    if current_phase in ['not_started', 'day']:
        update_state['game_phase'] = 'night'
        update_state['night_actions_completed'] = []
        update_state['current_vote'] = None
        if current_phase == 'not_started':
            update_state['night_number'] = 1
        else:
            update_state['night_number'] += 1
        add_log(f"进入第 {update_state['night_number']} 晚。", "all", update_state)
    else:
        update_state['game_phase'] = 'day'
        add_log("天亮了。", "all")
    
    return update_state
    # broadcast_all(socketio)


# 执行投票
def handle_initiate_vote(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()

    if update_state['game_phase'] != 'day' or update_state.get('current_vote'): return
    target_username = detail.get('target_username')

    if not target_username or target_username not in update_state['players']: return

    voters = [p for p_name, p in update_state['players'].items()
                if p['status'] not in ['dead', 'executed'] and p_name != target_username]

    update_state['current_vote'] = {"target": target_username, "votes": {}, "voters": [p['username'] for p in voters]}
    add_log(f"说书人对玩家 '{target_username}' 发起了处决投票。", "all")

    vote_data = {"target": target_username}
    for voter in voters:
        # if voter.get('sid'):
        #     socketio.emit('initiate_vote', vote_data, to=voter['sid'])
        publish_private_message(
            target_user_id=voter['username'],
            event_name='initiate_vote',
            payload=vote_data
        )



# 坏人阵营初始化
def handle_evil_team_setup(data, socketio):
    bluff_roles = data.get('bluff_roles', [])
    if len(bluff_roles) != 3: return
    evil_players = {u: p for u, p in game_state['players'].items() if p['is_evil']}
    if not evil_players: return

    imp = next((p for p in evil_players.values() if p.get('is_imp')), None)
    minions = [p for p in evil_players.values() if not p.get('is_imp') and p['is_evil']]
    bluff_info = f"不在场的3个善良角色是: {', '.join(bluff_roles)}。"

    if imp and imp.get('sid'):
        minion_info = ", ".join([f"{m['number']}号-{m['username']}({m['role']})" for m in minions]) if minions else "无"
        imp_message = f"你的爪牙队友是: {minion_info}。{bluff_info}"
        socketio.emit('receive_system_message', {'message': imp_message, 'type': 'info'}, to=imp['sid'])
        add_log(f"[系统信息] {imp_message}", [imp['username'], game_state['storyteller_username']])

    for m in minions:
        if m.get('sid'):
            imp_info = f"{imp['number']}号-{imp['username']}" if imp else "未知"
            minion_message = f"你的恶魔是 {imp_info}。你的邪恶队友有: {', '.join(p['username'] for p in evil_players.values())}。{bluff_info}"
            socketio.emit('receive_system_message', {'message': minion_message, 'type': 'info'}, to=m['sid'])
            add_log(f"[系统信息] {minion_message}", [m['username'], game_state['storyteller_username']])

    if "恶魔爪牙信息" not in game_state['night_actions_completed']:
        game_state['night_actions_completed'].append("恶魔爪牙信息")
    broadcast_all(socketio)


# 唤醒玩家
def handle_wake_player(data, socketio):
    target_username = data.get('target_username')
    role_action = data.get('role_action')
    player = game_state['players'].get(target_username)
    if player and player.get('sid'):
        add_log(f"说书人正在唤醒 {target_username} ({role_action})。",
                [target_username, game_state['storyteller_username']])
        socketio.emit('wake_up', {'role': role_action}, to=player['sid'])
    broadcast_all(socketio)


# 发送信息给玩家
def handle_info_to_player(data, socketio):
    target_username = data.get('target_username')
    message = data.get('message')
    role_action = data.get('role_action')
    player = game_state['players'].get(target_username)
    if player and player.get('sid') and message and role_action:
        socketio.emit('receive_system_message', {'message': message, 'type': 'info'}, to=player['sid'])
        add_log(f"说书人向 {target_username} 发送信息: {message}",
                [target_username, game_state['storyteller_username']])
        if role_action not in game_state['night_actions_completed']:
            game_state['night_actions_completed'].append(role_action)
    broadcast_all(socketio)


# 处理说书人结果给玩家
def handle_fortune_teller_result(data, socketio):
    target_username = data.get('target_username')
    result = data.get('result')
    player = game_state['players'].get(target_username)
    if player and player.get('sid') and result:
        message = f"关于你选择的目标，说书人的答复是: 【{result}】"
        socketio.emit('receive_system_message', {'message': message, 'type': 'info'}, to=player['sid'])
        add_log(f"说书人向 {target_username} 回复: {result}", [target_username, game_state['storyteller_username']])
        if "占卜师" not in game_state['night_actions_completed']:
            game_state['night_actions_completed'].append("占卜师")
    broadcast_all(socketio)


# 处理更新玩家状态
def handle_update_player_status(data, socketio):
    target_username = data.get('target_username')
    status = data.get('status')
    if target_username in game_state['players']:
        game_state['players'][target_username]['status'] = status
        add_log(f"说书人将 '{target_username}' 的状态更新为: {status}。", [game_state['storyteller_username']])
    broadcast_all(socketio)


# 处理更新玩家效果
def handle_toggle_player_effect(data, socketio):
    target_username = data.get('target_username')
    effect = data.get('effect')
    if target_username in game_state['players']:
        player_effects = game_state['players'][target_username].setdefault('effects', [])
        if effect in player_effects:
            player_effects.remove(effect)
            add_log(f"说书人移除了 '{target_username}' 的 {effect} 效果。", [game_state['storyteller_username']])
        else:
            player_effects.append(effect)
            add_log(f"说书人对 '{target_username}' 添加了 {effect} 效果。", [game_state['storyteller_username']])
    broadcast_all(socketio)


# 处理跳过行动
def handle_skip_action(data, socketio):
    role_action = data.get('role_action')
    if role_action and role_action not in game_state['night_actions_completed']:
        game_state['night_actions_completed'].append(role_action)
        add_log(f"说书人跳过了 {role_action} 的行动。", [game_state['storyteller_username']])
    broadcast_all(socketio)


#
def handle_set_imp(data, socketio):
    target_username = data.get('target_username')
    if target_username in game_state['players']:
        for p in game_state['players'].values(): p['is_imp'] = False
        game_state['players'][target_username]['is_imp'] = True
        add_log(f"说书人将 '{target_username}' 设为当前的小恶魔。", [game_state['storyteller_username']])
    broadcast_all(socketio)


def handle_send_log_to_spy(data, socketio):
    target_username = data.get('target_username')
    spy = game_state['players'].get(target_username)
    if not spy or not spy.get('sid'): return

    current_night = game_state['night_number']

    night_logs_chrono = [
        log['message'] for log in reversed(game_state['action_logs'])
        if log.get('night') == current_night and log.get('to') != 'all'
    ]

    log_message = f"第{current_night}夜日志摘要:\n" + "\n".join(
        night_logs_chrono) if night_logs_chrono else f"第{current_night}夜无特殊行动记录。"

    socketio.emit('receive_system_message', {'message': log_message, 'type': 'info'}, to=spy['sid'])
    add_log(f"向间谍({spy['username']})发送了当夜日志。", [game_state['storyteller_username']])
    if "间谍" not in game_state['night_actions_completed']:
        game_state['night_actions_completed'].append("间谍")

    emit('update_game_state', game_state, to=game_state['storyteller_sid'])


# 处理说书人清除投票显示
def handle_clear_vote_display(data, socketio):
    if game_state.get('current_vote'):
        game_state['current_vote'] = None
        add_log("说书人清除了投票结果显示。", [game_state['storyteller_username']])
    broadcast_all(socketio)


def handle_reset_vote(data, socketio):
    if game_state.get('current_vote'):
        game_state['current_vote'] = None
        add_log("说书人重置了投票。", 'all')
    broadcast_all(socketio)

# --- 玩家行为处理器 ---
def handle_player_choice(data, username, socketio):
    player = game_state['players'].get(username)
    if not player: return
    role_action = data.get('role_action')
    targets = data.get('targets', [])

    message_to_st = f"玩家 {player['number']}号-{username}({player['role']}) "
    if targets:
        message_to_st += f"选择了目标: {', '.join(targets)}。"
    else:
        message_to_st += "已确认收到信息。"

    if game_state['storyteller_sid']:
        socketio.emit('receive_system_message', {
            'message': message_to_st, 'type': 'player_action', 'from_role': player['role'], 'targets': targets
        }, to=game_state['storyteller_sid'])

    add_log(message_to_st, [username, game_state['storyteller_username']])

    if role_action in ['僧侣', '小恶魔', '投毒者', '守鸦人', '管家', '占卜师', '洗衣妇', '图书管理员', '调查员', '厨师',
                       '共情者', '间谍']:
        if role_action not in game_state['night_actions_completed']:
            game_state['night_actions_completed'].append(role_action)

    broadcast_all(socketio)


def handle_player_vote(data, username, socketio):
    vote_info = game_state.get('current_vote')
    if not vote_info or username not in vote_info['voters'] or username in vote_info['votes']: return

    vote = data.get('vote')
    vote_info['votes'][username] = vote
    voter = game_state['players'][username]

    add_log(f"玩家 {voter['number']}号-{username} 已投票。", [game_state['storyteller_username']])

    # 修改：检查投票是否结束
    if len(vote_info['votes']) == len(vote_info['voters']):
        vote_info['status'] = 'finished' # 设置状态为'finished'
        votes = list(vote_info['votes'].values())
        yes_votes = votes.count('yes')
        no_votes = votes.count('no')
        null_votes = votes.count('null')

        result_message = f"对 '{vote_info['target']}' 的投票结束: 赞成: {yes_votes}票, 反对: {no_votes}票, 弃权: {null_votes}票。"
        add_log(result_message, [game_state['storyteller_username']]) # 将结果发给所有人看日志

        # 注意：此处不再将 current_vote 设为 None
        # game_state['current_vote'] = None

    broadcast_all(socketio)

