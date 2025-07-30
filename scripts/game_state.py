# -*- coding: utf-8 -*-
from scripts.config import ROLES, GOOD_ROLES, BAD_ROLES, FIRST_NIGHT_ORDER, OTHER_NIGHTS_ORDER, ROLE_DESCRIPTIONS

"""
这个文件负责管理游戏的核心状态。
使用一个字典来作为单例，确保全局只有一个游戏状态实例。
"""

game_state = {
    "players": {},
    "game_phase": "not_started",
    "night_number": 0,
    "action_logs": [],
    "storyteller_sid": None,
    "storyteller_username": None,
    "night_actions_completed": [],
    "current_vote": None,
    "first_night_order": FIRST_NIGHT_ORDER,
    "other_nights_order": OTHER_NIGHTS_ORDER,
    "roles": ROLES,
    "good_roles": GOOD_ROLES,
    "bad_roles": BAD_ROLES,
    "role_descriptions": ROLE_DESCRIPTIONS
}


def reset_game_state():
    """重置游戏状态到初始值。"""
    global game_state
    game_state.update({
        "players": {},
        "game_phase": "not_started",
        "night_number": 0,
        "action_logs": [],
        "storyteller_sid": None,
        "storyteller_username": None,
        "night_actions_completed": [],
        "current_vote": None,
    })

