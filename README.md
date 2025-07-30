<!-- 项目 Logo (可选) -->
<p align="center">
  <img src="static/images/logo.png" alt="Bloody Bell Tower Logo" width="200">
</p>

<h1 align="center">血染钟楼 - 暗流涌动 (网页助手)</h1>

<!-- Shields -->
<!-- <p align="center">
  <a href="https://github.com/[你的用户名]/[你的仓库名]/releases">
    <img src="https://img.shields.io/github/v/release/[你的用户名]/[你的仓库名]" alt="Release">
  </a>
  <a href="https://github.com/[你的用户名]/[你的仓库名]/commits">
    <img src="https://img.shields.io/github/last-commit/[你的用户名]/[你的仓库名]" alt="Last Commit">
  </a>
  <a href="https://github.com/[你的用户名]/[你的仓库名]/issues">
    <img src="https://img.shields.io/github/issues/[你的用户名]/[你的仓库名]" alt="Issues">
  </a>
  <a href="https://github.com/[你的用户名]/[你的仓库名]/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/[你的用户名]/[你的仓库名]" alt="License">
  </a>
</p> -->

这是一个为桌游《血染钟楼》之“暗流涌动”剧本设计的网页版说书人助手。它通过一个图形化界面（GUI）启动本地服务器，玩家和说书人可以通过浏览器访问特定网址，从而极大地简化说书人的操作，帮助其管理复杂的游戏流程。

## ✨ 主要功能

*   **图形化服务器控制器:** 提供一个使用 PySide6 制作的桌面应用，用于一键启动和关闭游戏服务器。

*   **网页化游戏界面:**

    *   **说书人端:** 拥有完整的游戏控制权，包括：
        *   切换白天/夜晚阶段。
        *   直观的环形玩家席位图，方便点击操作。
        *   追踪并执行夜晚行动顺序。
        *   实时修改玩家状态（存活/死亡/仅剩一票）和附加效果（中毒/守护等）。
        *   向特定玩家发送信息和伪报。
        *   发起处决投票并查看结果。
    *   **玩家端:** 简洁的界面，用于：
        *   查看自己的身份和状态。
        *   在夜晚被唤醒并执行行动（如选择目标）。
        *   接收来自说书人的私密信息。
        *   参与投票。

*   **实时同步:** 基于 Flask-SocketIO (WebSocket) 实现，所有玩家和说书人的界面都能实时同步游戏状态。

*   **跨平台运行:** 可直接通过 Python 环境运行。

*   **打包支持:** 提供了 PyInstaller 打包脚本，可以生成免安装的 .exe 可执行文件，方便在 Windows 上分发和使用。

## 🛠️ 技术栈

*   **后端:** Python, Flask, Flask-SocketIO, eventlet
*   **前端:** HTML, Tailwind CSS, JavaScript
*   **桌面 GUI:** PySide6
*   **打包工具:** PyInstaller

## 📂 项目结构

```
├── scripts/                # 核心逻辑脚本
│   ├── actions.py          # 游戏行为函数
│   ├── config.py           # 游戏静态配置 (角色, 夜晚顺序等)
│   ├── events.py           # SocketIO 事件处理
│   ├── game_state.py       # 全局游戏状态管理
│   └── routes.py           # Flask HTTP 路由
├── static/                 # 静态文件
│   ├── images/
│   └── js/
├── templates/              # HTML 模板
│   ├── game_board.html
│   └── login.html
├── main.py                 # Flask 应用主文件
├── SetupUI.py              # PySide6 图形界面控制器
├── build.spec              # PyInstaller 打包配置文件
└── requirements.txt        # Python 依赖库
```

## 🚀 安装与运行

1.  **环境准备**

    确保您已安装 Python 3.9+。

    克隆本项目到本地:

    ```bash
    git clone [你的仓库链接]
    cd [项目文件夹]
    ```

2.  **创建虚拟环境并安装依赖**

    建议使用虚拟环境以隔离项目依赖。

    *   创建虚拟环境:

        ```bash
        python -m venv venv
        ```

    *   激活虚拟环境:

        ```bash
        Windows (CMD): .\venv\Scripts\activate
        Windows (PowerShell): .\venv\Scripts\Activate.ps1
        macOS / Linux: source venv/bin/activate
        ```

    *   安装依赖:

        ```bash
        pip install -r requirements.txt
        ```

        (注: `requirements.txt` 文件需要您通过 `pip freeze > requirements.txt` 命令在您的虚拟环境中生成)

3.  **运行程序**

    激活虚拟环境后，直接运行 `SetupUI.py` 即可启动图形界面控制器。

    ```bash
    python SetupUI.py
    ```

    点击 "启动服务器" 按钮后，即可根据界面提示在浏览器中打开相应地址开始游戏。

## 📦 打包为可执行文件

本项目已配置好 `build.spec` 文件，用于生成单文件的 `.exe` 程序。

1.  安装 PyInstaller:

    ```bash
    pip install pyinstaller
    ```

2.  执行打包: (请确保在已激活的虚拟环境中运行此命令)

    ```bash
    pyinstaller build.spec
    ```

    打包完成后，最终的可执行文件会生成在 `dist` 文件夹内，名为 `血染钟楼助手.exe`。

## 📸 应用截图

<!--
建议将图片放到 static/images/ 目录下，并使用相对路径引用
-->

*   登录界面:

    <img src="static/images/login_screenshot.png" alt="登录界面" width="400">

*   说书人界面:

    <img src="static/images/storyteller_screenshot.png" alt="说书人界面" width="400">

*   玩家界面:

    <img src="static/images/player_screenshot.png" alt="玩家界面" width="400">

## 📄 许可证

本项目采用 MIT 许可证。