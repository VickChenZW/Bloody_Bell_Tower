# -*- coding: utf-8 -*-
# from flask_socketio import emit
from scripts.game_state import set_game_state_in_redis, publish_state_update, publish_private_message


"""
这个文件包含说书人游戏行为逻辑函数。
这些函数负责修改 game_state。
新增使用redis 缓存
"""


# --- 辅助函数 ---

def add_log(current_state: dict, message: str, relevant_users) -> dict:
    """
    一个无状态的辅助函数。
    它接收当前的状态，在其中添加一条日志，然后返回更新后的状态。
    """
    # 使用深拷贝以确保我们不会意外修改原始字典的内部列表
    updated_state = current_state.copy()
    
    log_entry = {
        "message": message,
        "to": relevant_users,
        "night": updated_state.get('night_number', 0),
        "phase": updated_state.get('game_phase', 'not_started')
    }
    
    action_logs = updated_state.get('action_logs', [])
    action_logs.insert(0, log_entry)
    updated_state['action_logs'] = action_logs[:100]
    
    return updated_state


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
        update_state['players'][username]['is_bad'] = role in update_state['bad_roles']
        update_state['players'][username]['is_evil'] = role == '小恶魔'
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
                'description': update_state.get('role_descriptions', {}).get(role, '暂无描述。')
            }
        )
    add_log(current_state,"游戏开始！角色已分配。", "all")
    # 游戏开始后，直接进入首夜
    # handle_change_phase(current_state=update_state)
    update_state['game_phase'] = 'night'
    update_state['night_number'] = 1
    final_state = add_log(updated_state, "游戏开始！角色已分配。", "all")
    final_state = add_log(final_state, "进入第 1 晚。", "all") # 链式调用
    return final_state



# 更新轮次
def handle_change_phase(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()

    current_phase = update_state.get('game_phase')
    if current_phase in ['not_started', 'day']:
        update_state['game_phase'] = 'night'
        update_state['night_actions_completed'] = []
        update_state['current_vote'] = None
        if current_phase == 'not_started':
            update_state['night_number'] = 1
        else:
            update_state['night_number'] += 1
        add_log(update_state,f"进入第 {update_state['night_number']} 晚。", "all", update_state)
    else:
        update_state['game_phase'] = 'day'
        add_log(update_state,"天亮了。", "all")
    
    return update_state
    # broadcast_all(socketio)


# init vote
def handle_initiate_vote(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()

    if update_state['game_phase'] != 'day' or update_state.get('current_vote'): return
    target_username = detail.get('target_username')

    if not target_username or target_username not in update_state['players']: return

    voters = [p for p_name, p in update_state['players'].items()
                if p['status'] not in ['dead', 'executed'] and p_name != target_username]

    update_state['current_vote'] = {"target": target_username, "votes": {}, "voters": [p['username'] for p in voters]}
    add_log(update_state, f"说书人对玩家 '{target_username}' 发起了处决投票。", "all")

    vote_data = {"target": target_username}
    for voter in voters:
        publish_private_message(
            target_user_id=voter['username'],
            event_name='receive_system_message',
            payload={
                'message': vote_data,
                'type':'info'}

        )
    return update_state




# bad team setup
def handle_evil_team_setup(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()

    bluff_roles = detail.get('bluff_roles', [])
    if len(bluff_roles) != 3: return
    bad_players = {u: p for u, p in update_state['players'].items() if p['is_bad']}
    if not bad_players: return

    imp = next((p for p in bad_players.values() if p.get('is_evil')), None)
    minions = [p for p in bad_players.values() if not p.get('is_evil') and p['is_bad']]
    bluff_info = f"不在场的3个善良角色是: {', '.join(bluff_roles)}。"

    # if imp and imp.get('sid'):
    minion_info = ", ".join([f"{m['number']}号-{m['username']}({m['role']})" for m in minions]) if minions else "无"
    evil_message = f"你的爪牙队友是: {minion_info}。{bluff_info}"
    # socketio.emit('receive_system_message', {'message': imp_message, 'type': 'info'}, to=imp['sid'])
    add_log(update_state,f"[系统信息] {evil_message}", [imp['username'], update_state['storyteller_username']])
    publish_private_message(
        target_user_id=imp['username'],
        event_name='receive_system_message',
        payload={
            'message': evil_message,
            'type': 'info'
        }
        )
    # send to minions
    for m in minions:
        imp_info = f"{imp['number']}号-{imp['username']}" if imp else "未知"
        minion_message = f"你的恶魔是 {imp_info}。你的邪恶队友有: {', '.join(p['username'] for p in evil_players.values())}。{bluff_info}"
        # socketio.emit('receive_system_message', {'message': minion_message, 'type': 'info'}, to=m['sid'])
        publish_private_message(
            target_user_id=m['username'],
            event_name='receive_system_message',
            payload={
                'message': minion_message,
                'type': 'info'
            }
        )

        add_log(update_state,f"[系统信息] {minion_message}", [m['username'], game_state['storyteller_username']])

    if "恶魔爪牙信息" not in update_state['night_actions_completed']:
        update_state['night_actions_completed'].append("恶魔爪牙信息")
    # broadcast_all(socketio)
    return update_state


# 唤醒玩家
def handle_wake_player(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()

    target_username = detail.get('target_username')
    role_action = detail.get('role_action')
    player = update_state['players'].get(target_username)
    if player:
        add_log(update_state,f"说书人正在唤醒 {target_username} ({role_action})。",
                [target_username, update_state['storyteller_username']])
        # socketio.emit('wake_up', {'role': role_action}, to=player['sid'])
        publish_private_message(
            target_user_id=target_username,
            event_name='wake_up',
            payload={
                'role': role_action,
                'type': 'info'
            }
        )
    
    return update_state



# 发送信息给玩家
def handle_info_to_player(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()
    
    target_username = detail.get('target_username')
    message = detail.get('message')
    role_action = detail.get('role_action')
    player = update_state['players'].get(target_username)
    if player and message and role_action:
        # socketio.emit('receive_system_message', {'message': message, 'type': 'info'}, to=player['sid'])
        publish_private_message(
            target_user_id=target_username,
            event_name='receive_system_message',
            payload={
                'message': message,
                'type': 'info'
            }
        )

        add_log(update_state, f"说书人向 {target_username} 发送信息: {message}",
                [target_username, update_state['storyteller_username']])
        if role_action not in update_state['night_actions_completed']:
            update_state['night_actions_completed'].append(role_action)
    # broadcast_all(socketio)
    return update_state



# 处理说书人结果给玩家
def handle_fortune_teller_result(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()
    
    target_username = detail.get('target_username')
    result = detail.get('result')
    player = update_state['players'].get(target_username)
    if player and result:
        message = f"关于你选择的目标，说书人的答复是: 【{result}】"
        publish_private_message(
            target_user_id=target_username,
            event_name='receive_system_message',
            payload={
                'message': message,
                'type': 'info'
            }
        )

        # socketio.emit('receive_system_message', {'message': message, 'type': 'info'}, to=player['sid'])
        add_log(update_state,f"说书人向 {target_username} 回复: {result}", [target_username, update_state['storyteller_username']])
        if "占卜师" not in update_state['night_actions_completed']:
            update_state['night_actions_completed'].append("占卜师")
    # broadcast_all(socketio)
    return update_state



# 处理更新玩家状态
def handle_update_player_status(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()
    target_username = detail.get('target_username')
    status = detail.get('status')
    if target_username in update_state['players']:
        update_state['players'][target_username]['status'] = status
        add_log(update_state, f"说书人将 '{target_username}' 的状态更新为: {status}。", [update_state['storyteller_username']])
    # broadcast_all(socketio)
    return update_state


# 处理更新玩家效果
def handle_toggle_player_effect(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()
    
    target_username = detail.get('target_username')
    effect = detail.get('effect')
    if target_username in update_state['players']:
        player_effects = update_state['players'][target_username].setdefault('effects', [])
        if effect in player_effects:
            player_effects.remove(effect)
            add_log(update_state, "说书人移除了 '{target_username}' 的 {effect} 效果。", [update_state['storyteller_username']])
        else:
            player_effects.append(effect)
            add_log(update_state,f"说书人对 '{target_username}' 添加了 {effect} 效果。", [update_state['storyteller_username']])
    # broadcast_all(socketio)
    return update_state


#region 处理跳过行动
# def handle_skip_action(data, socketio):
#     role_action = data.get('role_action')
#     if role_action and role_action not in game_state['night_actions_completed']:
#         game_state['night_actions_completed'].append(role_action)
#         add_log(f"说书人跳过了 {role_action} 的行动。", [game_state['storyteller_username']])
#     broadcast_all(socketio)
#endregion 处理跳过行动



#
def handle_set_imp(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()
    
    target_username = detail.get('target_username')
    if target_username in update_state['players']:
        for p in update_state['players'].values(): p['is_imp'] = False
        update_state['players'][target_username]['is_imp'] = True
        add_log(update_state, f"说书人将 '{target_username}' 设为当前的小恶魔。", [update_state['storyteller_username']])
    # broadcast_all(socketio)
    return update_state


def handle_send_log_to_spy(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()
    
    target_username = detail.get('target_username')
    spy = update_state['players'].get(target_username)
    if not spy: return

    current_night = update_state['night_number']

    night_logs_chrono = [
        log['message'] for log in reversed(update_state['action_logs'])
        if log.get('night') == current_night and log.get('to') != 'all'
    ]

    log_message = f"第{current_night}夜日志摘要:\n" + "\n".join(
        night_logs_chrono) if night_logs_chrono else f"第{current_night}夜无特殊行动记录。"

    # socketio.emit('receive_system_message', {'message': log_message, 'type': 'info'}, to=spy['sid'])
    publish_private_message(
        target_user_id=target_username,
        event_name='receive_system_message',
        payload={
            'message': log_message,
            'type': 'info'
        }
    )

    add_log(update_state, f"向间谍({spy['username']})发送了当夜日志。", [update_state['storyteller_username']])
    if "间谍" not in update_state['night_actions_completed']:
        update_state['night_actions_completed'].append("间谍")

    # emit('update_game_state', game_state, to=game_state['storyteller_sid'])


# region
# 处理说书人清除投票显示
# def handle_clear_vote_display(detail:dict, user_id:str, current_state: dict):
#     handle_update_player_status(detail, user_id, current_state)

#     if game_state.get('current_vote'):
#         game_state['current_vote'] = None
#         add_log("说书人清除了投票结果显示。", [game_state['storyteller_username']])
#     broadcast_all(socketio)


# def handle_reset_vote(data, socketio):
#     if game_state.get('current_vote'):
#         game_state['current_vote'] = None
#         add_log("说书人重置了投票。", 'all')
#     broadcast_all(socketio)

# --- 玩家行为处理器 ---
#endregion


