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
            role = session.get('role')
            game_state['players'][username] = {
                "username": username, "role": role, "number": session.get('number'),
                "status": "alive", "effects": [], "sid": request.sid,
                "is_evil": role in game_state['bad_roles'], "is_imp": role == '小恶魔'
            }
            actions.add_log(f"玩家 {session.get('number')}号 '{username}' ({role}) 已加入。",
                            [game_state.get('storyteller_username')])

        actions.broadcast_all(socketio)

    @socketio.on('disconnect')
    def on_disconnect():
        username = session.get('username')
        if username:
            if username == game_state.get('storyteller_username'):
                game_state['storyteller_sid'] = None
                actions.add_log("说书人已断开连接。", "all")
            elif username in game_state['players']:
                actions.add_log(f"玩家 '{username}' 已断开连接。", [game_state.get('storyteller_username')])
                # del game_state['players'][username]
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
