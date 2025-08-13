# -*- coding: utf-8 -*-
from fastapi import FastAPI, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

import uvicorn

from app.scripts import security
from app.scripts import storyteller_action, player_action
from app.scripts import game_state





app = FastAPI(
    title="血染钟楼 - 后端API",
    description="使用FastAPI为血染钟楼助手提供业务逻辑API。",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境请修改为你的前端域名
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],  # 允许的 HTTP 方法
    allow_headers=["*"],  # 允许所有头部
)
async def get_current_user(token:str = Depends(security.oauth2_scheme)):
    """获取当前用户。"""
    return security.decode_token(token)


@app.post("/api/login")
async def login(payload: dict):

    if payload:
        user = payload.get("user")
        role = payload.get("role")
        number = payload.get("number")
        isStoryteller = payload.get("isStoryteller")
        print(user, role, number, isStoryteller)
        token = security.create_access_token(data={"sub": user, "role": role, "number": number, "isStoryteller": isStoryteller})
        
        game_state.reset_game_state()
        game_state.publish_state_update()
        
        return {"token": token}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
@app.post("/api/setup")
def setup(payload: dict, current_user: dict = Depends(get_current_user)):
    if payload.get("isStoryteller"):
        return {"message": "setup"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")



@app.post("/api/game-action")
async def handle_game_action(payload: dict, current_user: dict = Depends(get_current_user)):
    """
    【关键路由】
    这是处理所有游戏内行为的统一入口点。
    """
    user_id = current_user.get("username")
    is_storyteller = current_user.get("isStoryteller")

    
    # 从前端发来的数据中解析出 action 名称和 details
    action_name = payload.get('action')
    details = payload.get('details', {}) # 如果没有 details，给一个空字典

    if not action_name:
        raise HTTPException(status_code=400, detail="请求中缺少 'action' 字段")

    # 1. 动态查找 actions.py 模块里对应的处理函数
    if is_storyteller:
        handler_function = getattr(storyteller_action, f"handle_{action_name}", None)
    else:
        handler_function = getattr(player_action, f"handle_{action_name}", None)

    if not handler_function:
        raise HTTPException(status_code=400, detail=f"无效的操作: {action_name}")

    # 2. 从 Redis 获取当前的游戏状态
    current_state = game_state.get_game_state_from_redis()

    # 3. 【执行逻辑】调用找到的处理函数
    #    将所有需要的信息作为参数传入
    updated_state = handler_function(details, user_id, current_state)

    # 4. 【保存状态】将函数返回的新状态存回 Redis
    game_state.set_game_state_in_redis(updated_state)

    # 5. 【发布通知】通过 Redis Pub/Sub 发布全局更新通知
    #    注意：私信指令已经在 handler_function 内部通过 publish_private_message 发出了
    game_state.publish_state_update()
    
    return {"status": "success", "action_processed": action_name}


@app.post("api/authenticate")
def authenticate(payload: dict, current_user: dict =Depends(get_current_user)):
    """认证路由。"""
    return {"message": "authenticate"}





if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)

