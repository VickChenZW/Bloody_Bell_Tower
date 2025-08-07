# 血染钟楼 - 暗流涌动 游戏助手

这是一个为《血染钟楼》(Blood on the Clocktower) 设计的游戏助手应用，包含前端和后端两部分。

## 项目结构

- `frontend/`: Vue 3 前端应用
- `backend/`: Node.js + Express 后端服务

## 环境变量配置

为了使应用能在不同环境下运行，我们使用环境变量来配置后端API的基础URL。

1. 在 `frontend/` 目录下创建 `.env` 文件 (如果不存在):
   ```
   VITE_API_BASE_URL=http://your-backend-ip:5000
   ```
   将 `your-backend-ip` 替换为后端服务器的实际IP地址。

2. 如果没有配置环境变量，应用将默认使用 `http://localhost:5000` 作为后端API的基础URL。

## 安装和运行

### 后端

1. 进入 `backend/` 目录:
   ```bash
   cd backend
   ```

2. 安装依赖:
   ```bash
   npm install
   ```

3. 启动后端服务:
   ```bash
   node src/server.js
   ```
   后端服务将监听在所有网络接口的 5000 端口。

### 前端

1. 进入 `frontend/` 目录:
   ```bash
   cd frontend
   ```

2. 安装依赖:
   ```bash
   npm install
   ```

3. 启动开发服务器:
   ```bash
   npm run dev
   ```
   前端开发服务器将启动在 `http://localhost:5173`。

## 部署

在部署时，请确保配置好 `.env` 文件中的 `VITE_API_BASE_URL`，并确保后端服务器的 5000 端口可以通过防火墙访问。