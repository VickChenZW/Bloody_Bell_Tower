# -*- coding: utf-8 -*-
import eventlet
eventlet.monkey_patch(os=False)

from flask import Flask
from flask_socketio import SocketIO
import logging

from scripts.routes import register_routes
from scripts.events import register_events

# --- 初始化 ---
logging.basicConfig(level=logging.INFO)
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# --- 创建应用实例 ---
app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'a_very_secret_key_for_blood_on_the_clocktower_v13'
socketio = SocketIO(app, async_mode='eventlet', engineio_logger=False)

# --- 注册路由和事件 ---


register_routes(app, socketio)
register_events(socketio)

# --- 主程序入口 ---
if __name__ == '__main__':
    print("血染钟楼助手已启动，请在浏览器中打开 http://127.0.0.1:5000")
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
