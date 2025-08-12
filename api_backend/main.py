# -*- coding: utf-8 -*-
from fastapi import FastAPI, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

import uvicorn

from app.scripts import security



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
        return {"token": token}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
@app.post("/api/setup")
def setup(payload: dict, current_user: dict = Depends(get_current_user)):
    if payload.get("isStoryteller"):
        return {"message": "setup"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")



@app.get("/api/action")
async def protected_route(playload: dict, current_user: dict =Depends(get_current_user)):
    """受保护的路由。"""
    return {"message": "protected route"}

@app.post("api/authenticate")
def authenticate(payload: dict, current_user: dict =Depends(get_current_user)):
    """认证路由。"""
    return {"message": "authenticate"}





if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)

