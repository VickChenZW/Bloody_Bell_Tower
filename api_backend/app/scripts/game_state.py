# -*- coding: utf-8 -*-
from scripts.config import ROLES, GOOD_ROLES, BAD_ROLES, FIRST_NIGHT_ORDER, OTHER_NIGHTS_ORDER, ROLE_DESCRIPTIONS
import redis
import json

"""
这个文件负责管理游戏的核心状态。
使用一个字典来作为单例，确保全局只有一个游戏状态实例。
"""
# init redis client
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
print("redis client connected")


THE_GAME_KEY = "game_state"

# region
# game_state = {
#     "players": {},
#     "game_phase": "not_started",
#     "night_number": 0,
#     "action_logs": [],
#     "storyteller_sid": None,
#     "storyteller_username": None,
#     "night_actions_completed": [],
#     "current_vote": None,
#     "first_night_order": FIRST_NIGHT_ORDER,
#     "other_nights_order": OTHER_NIGHTS_ORDER,
#     "roles": ROLES,
#     "good_roles": GOOD_ROLES,
#     "bad_roles": BAD_ROLES,
#     "role_descriptions": ROLE_DESCRIPTIONS,

#     # 新增：用于随机分配模式的状态
#     "game_mode": "manual",  # 'manual' or 'random'
#     "total_player_count": 0,
#     "roles_to_assign": [],
#     "assigned_roles": {},  # {username: role}
#     "is_game_ready_to_start": False,
# }


# def reset_game_state():
#     """重置游戏状态到初始值。"""
#     global game_state
#     game_state.update({
#         "players": {},
#         "game_phase": "not_started",
#         "night_number": 0,
#         "action_logs": [],
#         "storyteller_sid": None,
#         "storyteller_username": None,
#         "night_actions_completed": [],
#         "current_vote": None,
#     })

# def set_game_state_in_redis(new_state:dict):
#     """设置游戏状态。"""
#     global game_state
#     game_state = new_state
#     redis_client.set(THE_GAME_KEY, json.dumps(game_state))


# # publish game state to redis channel
# def publish_game_state():
#     """发布游戏状态到Redis频道。"""
#     redis_client.publish(THE_GAME_KEY, json.dumps(game_state))
# endregion



def get_initial_state() -> dict:
    """
    创建一个“干净”的初始游戏状态字典。
    这个函数是状态的“蓝图”或“模板”。
    """
    return {
        "players": {}, # 玩家信息 {username: {username:str, role:str,is_storyteller:bool, is_bad:boolean, is_evil:boolean, status:str}}
        "game_phase": "not_started",
        "night_number": 0,
        "action_logs": [],
        "storyteller_username": None, # storyteller_sid 不再需要，因为通信由Node.js处理
        "night_actions_completed": [],
        "current_vote": None,
        "first_night_order": FIRST_NIGHT_ORDER,
        "other_nights_order": OTHER_NIGHTS_ORDER,
        "roles": ROLES,
        "good_roles": GOOD_ROLES,
        "bad_roles": BAD_ROLES,
        "role_descriptions": ROLE_DESCRIPTIONS,
        "game_mode": "manual",
        "total_player_count": 0,
        "roles_to_assign": [],
        "assigned_roles": {},
        "is_game_ready_to_start": False,
    }

def get_game_state_from_redis() -> dict:
    """
    从 Redis 中获取当前的游戏状态。
    这是所有业务逻辑获取状态的唯一入口。
    """
    state_json = redis_client.get(THE_GAME_KEY)
    if state_json:
        # 如果找到了，就从 JSON 字符串解析回 Python 字典
        return json.loads(state_json)
    else:
        # 如果 Redis 中不存在（比如服务器刚启动），就返回一个全新的初始状态
        return get_initial_state()

def set_game_state_in_redis(state: dict):
    """
    将一个完整的游戏状态字典写入 Redis。
    这是所有业务逻辑更新状态的唯一入口。
    """
    redis_client.set(THE_GAME_KEY, json.dumps(state))

def publish_state_update():
    """
    向 'game-updates' 频道发布一个简单的更新通知。
    Node.js 服务器会订阅这个频道。
    """
    # 我们只需要发送一个简单的信号，Node.js 收到后会自己去 Redis 取最新数据
    redis_client.publish('game-updates', "update")

def reset_game_state():
    """
    重置游戏：创建一个全新的初始状态并将其存入 Redis。
    这个函数会在说书人登录或重置游戏时被调用。
    """
    initial_state = get_initial_state()
    set_game_state_in_redis(initial_state)
    print("游戏状态已在 Redis 中重置为初始值。")

def publish_private_message(target_user_id: str, event_name: str, payload: dict):
    """
    向 'private-message' 频道发布一个精确投递的指令。

    :param target_user_id: 接收消息的目标用户ID (username)。
    :param event_name: 前端socket客户端监听的事件名。
    :param payload: 要发送的数据字典。
    """
    command = {
        "targetUserId": target_user_id,
        "eventName": event_name,
        "payload": payload
    }
    # 将指令序列化为JSON并发布
    redis_client.publish('private-message', json.dumps(command))

def player_join(username: str, role:str, number:str, isStoryteller:bool,gameMode:str):

    """
    玩家加入游戏时调用。
    会更新游戏状态中的玩家信息。
    """
    current_state = get_game_state_from_redis()
    if not username in current_state["players"]:
        if isStoryteller:
            current_state["storyteller_username"] = username
            current_state["game_mode"] = gameMode

        else:
            current_state["players"][username] = {
                "username": username,
                "role": role,
                "number": number,
                "isStoryteller": isStoryteller,
                "status": "alive",
            }
    set_game_state_in_redis(current_state)

    return current_state

def game_setup(selected_roles:list):
    """
    游戏设置时调用。
    会更新游戏状态中的玩家信息。
    """
    current_state = get_game_state_from_redis()
    if current_state["game_mode"] == "random":
        current_state["roles_to_assign"] = selected_roles
        current_state["total_player_count"] = len(selected_roles)
    print(current_state)
    set_game_state_in_redis(current_state)

    return current_state

