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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)

