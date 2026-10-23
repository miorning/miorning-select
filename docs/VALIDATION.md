# Verification scope / 验证范围

Version: **0.6.0**. Publication packaging reviewed on **2026-10-23**.

## 中文

此次公开整理基于此前本地审阅通过的 v0.6.0 插件。除版权注释与第三方来源说明外，运行逻辑未更改。

真实 Chrome Manifest V3 独立资料中的本地示例验收：

- 图片混合比较 10 项：本地 PNG/JPEG/WebP、GIF 静止预览、图片时钟不推进、视频与音频正常播放和定位、排序/屏蔽/删除、跨源页面与刷新恢复。
- 网页图片选择 8 项：picture/srcset、点选取消、视频封面去重、聊天图片、组内去重、data URI 等。
- 图片缓存与平台导入 9 项：PNG/JPEG/WebP/GIF/AVIF/BMP/SVG，缓存与导入原文件 SHA-256 一致；两次导入新增不同节点，不触碰替换入口或聊天发送。
- 原视频素材库 12 项、配乐编辑预览 14 项、自定义快捷键 7 项回归通过。
- 混合 16 条素材在 1440×900 和 1000×720 视口检查：素材卡片全部同屏，面板无横纵滚动。

上述测试使用可控本地示例。生产环境的 LibTV、即梦、GPT 等登录页面未逐一验收，不宣称全平台兼容。Edge、所有编解码器、低性能设备也不在此次全量验证范围。

源码随附的自动测试与语法检查可按 SOURCE.md 运行。旧版对原编码快速截取、音乐起点和 64 片段布局的测试记录属于历史证据，不冒充本次逐项重测。公开发布前另核对运行逻辑一致、许可证、依赖源码、ZIP 内容和 SHA-256。

## English

The public package is based on the previously reviewed v0.6.0 build. Runtime logic is unchanged apart from copyright comments and dependency-source notices.

Controlled local fixtures were exercised in a real Chrome Manifest V3 extension profile:

- 10 mixed-image comparison checks: local PNG/JPEG/WebP, static GIF preview, stationary image clocks, video/audio playback and seeking, sorting/disabling/deletion, cross-origin navigation and reload persistence.
- 8 webpage image-selection checks, including picture/srcset, toggle selection, video-poster deduplication, chat images, group deduplication and data URIs.
- 9 image cache/handoff checks covering PNG/JPEG/WebP/GIF/AVIF/BMP/SVG; cached and handed-off original bytes matched by SHA-256. Two imports created separate nodes without replacement inputs or chat Send.
- Regression checks: 12 original-media library checks, 14 soundtrack/editor preview checks and 7 custom-shortcut checks.
- All 16 mixed media cards fit at 1440×900 and 1000×720 without horizontal or vertical review-panel scrolling.

These checks use controlled local pages, not every production service. Logged-in LibTV, Dreamina and GPT pages were not individually accepted; no universal platform compatibility is claimed. This is not exhaustive Edge, codec or low-end-device validation.

Public automated tests and syntax checks can be run as described in SOURCE.md. Earlier lossless trim, soundtrack-start and 64-clip layout evidence remains historical, not a claim of newly repeating every test. Publication checks separately cover runtime equivalence, licenses, corresponding source, ZIP contents and SHA-256.
