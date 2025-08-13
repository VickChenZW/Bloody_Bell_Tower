# -*- coding: utf-8 -*-
# from flask_socketio import emit
from scripts.game_state import set_game_state_in_redis, publish_state_update, publish_private_message
from scripts.storyteller_action import add_log


"""
这个文件包含了玩家的游戏行为逻辑函数。
这些函数负责修改 game_state。
新增使用redis 缓存
"""




# --- 玩家行为处理器 ---
def handle_player_choice(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()

    player = update_state['players'].get(user_id)
    if not player: return
    role_action = detail.get('role_action')
    targets = detail.get('targets', [])

    message_to_st = f"玩家 {player['number']}号-{user_id}({player['role']}) "
    if targets:
        message_to_st += f"选择了目标: {', '.join(targets)}。"
    else:
        message_to_st += "已确认收到信息。"

    if update_state['storyteller_sid']:
        # socketio.emit('receive_system_message', {
        #     'message': message_to_st, 'type': 'player_action', 'from_role': player['role'], 'targets': targets
        # }, to=game_state['storyteller_sid'])
        publish_private_message(
            target_user_id=update_state['storyteller_username'],
            event_name='receive_system_message',
            payload={
                'message': message_to_st, 'type': 'player_action', 'from_role': player['role'], 'targets': targets
            }
        )


    add_log(message_to_st, [user_id, update_state['storyteller_username']])

    if role_action in ['僧侣', '小恶魔', '投毒者', '守鸦人', '管家', '占卜师', '洗衣妇', '图书管理员', '调查员', '厨师',
                        '共情者', '间谍']:
        if role_action not in update_state['night_actions_completed']:
            update_state['night_actions_completed'].append(role_action)

    # broadcast_all(socketio)
    return update_state



def handle_player_vote(detail:dict, user_id:str, current_state: dict):
    update_state = current_state.copy()
    
    vote_info = update_state.get('current_vote')
    if not vote_info or user_id not in vote_info['voters'] or user_id in vote_info['votes']: return

    vote = detail.get('vote')
    vote_info['votes'][user_id] = vote
    voter = update_state['players'][user_id]

    add_log(f"玩家 {voter['number']}号-{user_id} 已投票。", [update_state['storyteller_username']])

    # 修改：检查投票是否结束
    if len(vote_info['votes']) == len(vote_info['voters']):
        vote_info['status'] = 'finished' # 设置状态为'finished'
        votes = list(vote_info['votes'].values())
        yes_votes = votes.count('yes')
        no_votes = votes.count('no')
        null_votes = votes.count('null')

        result_message = f"对 '{vote_info['target']}' 的投票结束: 赞成: {yes_votes}票, 反对: {no_votes}票, 弃权: {null_votes}票。"
        add_log(result_message, [update_state['storyteller_username']]) # 将结果发给所有人看日志

        # 注意：此处不再将 current_vote 设为 None
        # game_state['current_vote'] = None

    # broadcast_all(socketio)
    return update_state

