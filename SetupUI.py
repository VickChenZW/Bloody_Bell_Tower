# -*- coding: utf-8 -*-
import sys
import multiprocessing
import socket
import os
from PySide6.QtWidgets import (QApplication, QMainWindow, QPushButton, QVBoxLayout, QHBoxLayout,
                            QWidget, QLabel, QLineEdit)
from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon

# 从主应用文件中导入 app 和 socketio 实例
# 确保 main.py 和 Setupui.py 在同一个文件夹下
from main import app, socketio


def resource_path(relative_path):
    """ 获取资源的绝对路径, 解决打包后路径问题 """
    try:
        # PyInstaller 创建一个临时文件夹, 并把路径存储在 _MEIPASS 中
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)


def get_local_ip():
    """
    一个更可靠的获取本地IP地址的方法，不依赖于主机名解析。
    """
    try:
        # 创建一个临时的 UDP 套接字（不需要实际发送数据）
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            # 连接到一个公共的 DNS 服务器地址（这不会真的建立连接）
            s.connect(("8.8.8.8", 80))
            # 获取套接字的本地地址
            ip = s.getsockname()[0]
    except Exception:
        # 如果上述方法失败，回退到 127.0.0.1
        ip = "127.0.0.1"
    return ip


def run_server(port):
    """这个函数将在一个独立的进程中运行 Flask 服务器。"""
    try:
        print("服务器进程已启动...")
        socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
    except Exception as e:
        print(f"服务器启动失败: {e}")


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("血染钟楼助手 - 服务器控制器")
        icon_path = resource_path("static/images/logo.png")
        print(icon_path)
        self.setWindowIcon(QIcon(icon_path))
        self.setFixedSize(300, 200)

        self.server_process = None

        # --- 创建UI组件 ---
        self.central_widget = QWidget()
        self.layout = QVBoxLayout(self.central_widget)

        self.config_layout = QHBoxLayout()
        self.port_label = QLabel("端口号")
        self.port_input = QLineEdit("5000")
        self.config_layout.addWidget(self.port_label)
        self.config_layout.addWidget(self.port_input)


        self.status_label = QLabel("服务器状态: 已停止")
        self.status_label.setAlignment(Qt.AlignCenter)

        self.start_button = QPushButton("启动服务器")
        self.start_button.setStyleSheet("background-color: #22c55e; color: white; padding: 10px; border-radius: 5px;")

        self.stop_button = QPushButton("关闭服务器")
        self.stop_button.setStyleSheet("background-color: #ef4444; color: white; padding: 10px; border-radius: 5px;")

        # --- 布局 ---
        self.layout.addWidget(self.status_label)
        self.layout.addLayout(self.config_layout)
        self.layout.addWidget(self.start_button)
        self.layout.addWidget(self.stop_button)
        self.setCentralWidget(self.central_widget)

        # --- 连接信号与槽 ---
        self.start_button.clicked.connect(self.start_server)
        self.stop_button.clicked.connect(self.stop_server)

        self.update_button_states()

    def update_button_states(self):
        """根据服务器进程是否存在来更新按钮的可用状态。"""
        is_running = self.server_process is not None and self.server_process.is_alive()
        self.start_button.setEnabled(not is_running)
        self.stop_button.setEnabled(is_running)
        if is_running:
            ip_address = get_local_ip()
            port = self.port_input.text()
            self.status_label.setText(f"服务器状态: 运行中\n请在浏览器打开 http://{ip_address}:{port}")
            self.status_label.setWordWrap(True)
            self.status_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
            self.status_label.setStyleSheet("color: #22c55e;")
        else:
            self.status_label.setText("服务器状态: 已停止")
            self.status_label.setStyleSheet("color: #ef4444;")

    def start_server(self):
        """启动服务器进程。"""
        if self.server_process is None or not self.server_process.is_alive():
            print("正在启动服务器...")
            port = self.port_input.text()
            self.server_process = multiprocessing.Process(target=run_server, args=(port,))
            self.server_process.start()
            self.update_button_states()

    def stop_server(self):
        """停止服务器进程。"""
        if self.server_process and self.server_process.is_alive():
            print("正在停止服务器...")
            self.server_process.terminate()
            self.server_process.join()  # 等待进程完全终止
            self.server_process = None
            self.update_button_states()
            print("服务器已停止。")

    def closeEvent(self, event):
        """重写窗口关闭事件，确保在关闭GUI时也关闭服务器。"""
        self.stop_server()
        event.accept()


if __name__ == '__main__':
    # PySide6/PyQt6 在多进程时需要设置启动方式
    multiprocessing.freeze_support()
    multiprocessing.set_start_method('spawn', force=True)

    app_gui = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app_gui.exec())
