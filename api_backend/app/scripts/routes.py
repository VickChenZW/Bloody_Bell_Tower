# -*- coding: utf-8 -*-
from flask import render_template, request, redirect, url_for, session
from scripts.game_state import game_state, reset_game_state
from scripts.actions import add_log
from scripts.config import ROLE_DESCRIPTIONS, GOOD_ROLES, BAD_ROLES
import random

"""
这个文件负责处理所有的 Flask HTTP 路由。
"""


def register_routes(app, socketio):
    @app.route('/')
    def index():
        if 'username' in session:
            return redirect(url_for('game_board'))
        return render_template('login.html')

    # @app.route('/login', methods=['POST'])
    # def login():
    #     session['username'] = request.form.get('username')
    #     session['is_storyteller'] = 'is_storyteller' in request.form
    #     if session['is_storyteller']:
    #         session['role'], session['number'] = '说书人', 'ST'
    #     else:
    #         session['role'], session['number'] = request.form.get('role'), request.form.get('number')
    #     return redirect(url_for('game_board'))

    @app.route('/login', methods=['POST'])
    def login():
        game_mode = request.form.get('game_mode')
        session['game_mode'] = game_mode
        session['username'] = request.form.get('username')
        session['is_storyteller'] = 'is_storyteller' in request.form

        if session['is_storyteller']:
            reset_game_state()  # 说书人登录时重置游戏
            game_state['game_mode'] = game_mode
            session['role'], session['number'] = '说书人', 'ST'
            if game_mode == 'random':
                return redirect(url_for('setup_game'))
        else:
            if game_mode == 'manual':
                session['role'] = request.form.get('role')
            else:  # random mode
                session['role'] = '未知'  # 随机模式下，玩家角色初始为未知
            session['number'] = request.form.get('number')
        return redirect(url_for('game_board'))

    @app.route('/setup_game', methods=['GET', 'POST'])
    def setup_game():
        if not session.get('is_storyteller') or session.get('game_mode') != 'random':
            return redirect(url_for('index'))

        if request.method == 'POST':
            game_state['total_player_count'] = int(request.form.get('player_count'))
            game_state['roles_to_assign'] = request.form.getlist('roles')
            random.shuffle(game_state['roles_to_assign'])  # 洗牌
            add_log(f"说书人已配置游戏：总共 {game_state['total_player_count']} 名玩家。", "all")
            return redirect(url_for('game_board'))

        role_types = {role: 'good' if role in GOOD_ROLES else 'evil' for role in GOOD_ROLES + BAD_ROLES}
        return render_template('setup_game.html', role_descriptions=ROLE_DESCRIPTIONS, role_types=role_types)

    @app.route('/game_board')
    def game_board():
        if 'username' not in session: return redirect(url_for('index'))
        return render_template('game_board.html', session=session, roles=game_state['roles'])

    @app.route('/logout')
    def logout():
        username = session.get('username')
        if username in game_state['players']:
            del game_state['players'][username]
            add_log(f"玩家 '{username}' 已离开游戏。", [game_state.get('storyteller_username')])
            from scripts.actions import broadcast_all
            broadcast_all(socketio)
        session.clear()
        return redirect(url_for('index'))

    @app.route('/reset_game')
    def reset_game():
        if not session.get('is_storyteller'): return redirect(url_for('index'))
        reset_game_state()
        add_log("游戏已被说书人重置。", "all")
        socketio.emit('force_reload', {})
        return redirect(url_for('index'))
