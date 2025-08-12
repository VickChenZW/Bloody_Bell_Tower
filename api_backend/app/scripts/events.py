# -*- coding: utf-8 -*-
from flask import session, request
from flask_socketio import emit, join_room, leave_room
from scripts.game_state import game_state
import scripts.actions as actions

"""
这个文件负责处理所有的 SocketIO 事件。
它作为视图和逻辑之间的桥梁。
"""


def register_events(socketio):
    @socketio.on('connect')
    def on_connect():
        username = session.get('username')
        if not username: return

        if session.get('is_storyteller'):
            game_state['storyteller_sid'] = request.sid
            game_state['storyteller_username'] = username
            actions.add_log("说书人已连接。", [username])
        else:
            # 防止同一用户重复连接
            if username in game_state['players']:
                game_state['players'][username]['sid'] = request.sid
                actions.add_log(f"玩家 '{username}' 已重新连接。", [game_state.get('storyteller_username')])
            else:
                role = session.get('role')
                game_state['players'][username] = {
                    "username": username, "role": role, "number": session.get('number'),
                    "status": "alive", "effects": [], "sid": request.sid,
                    "is_evil": role in game_state['bad_roles'], "is_imp": role == '小恶魔'
                }
                actions.add_log(f"玩家 {session.get('number')}号 '{username}' ({role}) 已加入。",
                                [game_state.get('storyteller_username')])
                # 在随机模式下，检查玩家是否到齐
        if game_state.get('game_mode') == 'random' and game_state.get('total_player_count') > 0:
            if len(game_state['players']) == game_state['total_player_count']:
                game_state['is_game_ready_to_start'] = True
                actions.add_log("所有玩家已到齐，说书人可以开始游戏。", "all")

        actions.broadcast_all(socketio)

    @socketio.on('disconnect')
    def on_disconnect():
        username = session.get('username')
        if username:
            if username == game_state.get('storyteller_username'):
                game_state['storyteller_sid'] = None
                actions.add_log("说书人已断开连接。", "all")
            elif username in game_state['players']:
                if game_state.get('game_mode') == 'random' and game_state.get('game_phase') == 'not_started':
                    del game_state['players'][username]
                    game_state['is_game_ready_to_start'] = False
                    actions.add_log(f"玩家 '{username}' 在游戏开始前离开。", "all")
                else:
                    # 游戏开始后，只标记断线
                    game_state['players'][username]['sid'] = None
                    actions.add_log(f"玩家 '{username}' 已断开连接。", [game_state.get('storyteller_username')])
            actions.broadcast_all(socketio)

    @socketio.on('storyteller_action')
    def on_storyteller_action(data):
        if not session.get('is_storyteller'): return
        action_name = data.get('action')
        handler_name = f"handle_{action_name}"
        handler = getattr(actions, handler_name, None)
        if handler:
            handler(data, socketio)

    @socketio.on('player_action')
    def on_player_action(data):
        if session.get('is_storyteller'): return
        action_name = data.get('action')
        handler_name = f"handle_{action_name}"
        handler = getattr(actions, handler_name, None)
        if handler:
            handler(data, session['username'], socketio)
