# 更新日志 / Changelog

[简体中文](README.md) · [English](README.en.md) · [发布页 / Releases](https://github.com/miorning/miorning-select/releases)

## v0.6.0 — 2026-10-23

### 中文

- 新增图片对比：网页点选、本地选择与拖拽沿用现有入口，图片和视频合计最多 16 条同屏。
- 图片与动图预览固定为静止画面，图片时间条固定为零；仅有图片而无音视频时，总时间条也不推进。
- 图片支持排序、盲选、屏蔽、删除、跨网页恢复和原文件导入当前画布；完整原文件不重新压缩，动图原文件不被改写。
- 图片的截取、原声与精调按钮保持原位置并禁用，图片不进入视频剪辑器。未新增快捷键或改变既有绑定。
- 「本地视频」入口更名「本地素材」，猫头菜单相应改为「点选素材」。
- 提供中英双语公开文档；界面目前仍为中文。自有代码以 GPL-3.0-only 发布，第三方依赖保留各自许可证。

### English

- Added image comparison through existing webpage selection, file picker and drag-and-drop flows, with up to 16 combined image/video items in one view.
- Images and animated-image previews stay still, with image timelines fixed at zero. The main timeline also stays still when the library contains only images and no audio/video.
- Images support ordering, blind comparison, exclusion, deletion, cross-page restoration and original-file handoff to the current canvas. Original files are not recompressed or converted into still-image files.
- Image trim, original-audio and fine-edit controls remain in place but are disabled. Images are excluded from the video editor. Existing shortcut bindings are unchanged.
- Renamed the local-video entry to local media and updated the cat menu's selection label accordingly.
- Added public Chinese/English documentation. The UI remains Chinese. First-party code is released under GPL-3.0-only; third-party dependencies retain their licenses.

## v0.5.0 — 2026-10-22

### 中文

- 安装不再弹出欢迎页；普通网页默认显示轻量猫头。
- 素材库改为扩展本机存储，支持跨网页恢复、多标签页同步、单独删除、整体清空与旧项目追加。
- 加入 17 项可配置应用快捷键，以及缓存用量与浏览器资料路径入口。
- 完整原片支持新增导入当前画布；修复「剪辑 / 下载」全片预览的配乐起止点、延后与原声切换。

### English

- Removed the automatic welcome tab and enabled the lightweight cat on ordinary webpages by default.
- Moved the media library into extension-local storage, with cross-page restoration, multi-tab synchronization, deletion, clearing and legacy-project appending.
- Added 17 configurable application shortcuts, cache usage and a browser profile-path entry point.
- Added original-video handoff to the current canvas and fixed full-sequence music boundaries, delay and original-audio switching in the editor.

## v0.4.0 — 2026-10-22

### 中文

- 加入 H.264 / AVC MP4 单段原编码截取；不支持的来源明确拒绝，不静默降低清晰度。
- 支持末尾 2 秒与从终点向前截取；确认后每次新增内部片段和独立回贴文件。
- 移除框选，保留点选；更新小猫入口的悬停展开与收回；增加配乐起点选择。

### English

- Added packet-copy single-clip export for H.264 / AVC MP4, with explicit rejection of unsupported sources instead of a silent quality fallback.
- Added final-two-second and backward-from-endpoint selection, with a new internal clip and independently named handoff file for each confirmation.
- Removed box selection while retaining click selection, updated the cat's hover behavior, and added music start-point selection.

历史条目记录功能沿革，不表示这些版本都曾单独公开发布。 / Historical entries describe development changes; they do not imply that each version was separately published.
