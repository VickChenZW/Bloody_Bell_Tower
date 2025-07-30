# -*- mode: python ; coding: utf-8 -*-

# #############################################################################
# # build.spec (Optimized Version)
# #
# # This version includes an 'excludes' list to remove unused large
# # Qt modules, significantly reducing the final executable size and
# # improving startup time.
# #############################################################################

from PyInstaller.utils.hooks import collect_submodules

# The name of your main GUI script
main_script = 'SetupUI.py'

# The name for the final executable file
exe_name = '血染钟楼助手'

# --- Analysis Section ---
# This section tells PyInstaller where to find all the necessary code.
a = Analysis(
    [main_script],
    pathex=[],
    binaries=[],
    datas=[
        ('static', 'static'),
        ('templates', 'templates')
    ],
    hiddenimports=[
        'eventlet',
        'engineio.async_drivers.eventlet',
        'simple_websocket.ws',
        'eventlet.hubs.epolls',
        'eventlet.hubs.kqueue',
        'eventlet.hubs.selects',
        'PySide6.QtCore',
        'PySide6.QtGui',
        'PySide6.QtWidgets',
        'scripts.actions',
        'scripts.config',
        'scripts.events',
        'scripts.game_state',
        'scripts.routes',
    ] + collect_submodules('dns'),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    # --- 关键优化：排除未使用的 Qt 模块 ---
    excludes=[
        'PySide6.QtWebEngineCore',
        'PySide6.QtWebEngineWidgets',
        'PySide6.QtWebChannel',
        'PySide6.QtQuick',
        'PySide6.QtQml',
        'PySide6.QtMultimedia',
        'PySide6.Qt3DCore',
        'PySide6.Qt3DRender',
        'PySide6.QtTest',
        'PySide6.QtCharts',
        'PySide6.QtDataVisualization',
        'pydoc_data',
        'tkinter'
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False
)

# --- PYZ Section ---
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# --- EXE Section ---
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=exe_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='static/images/logo.png'
)

# --- COLLECT Section ---
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='dist'
)
