# 喵咛选片台 / Miorning Select v0.6.0

2026-10-23 · [简体中文](README.md) · [English](README.en.md)

## 中文

图片和视频，现在可以放在一起比了。网页点选、本地拖入都沿用原来的操作；按播放时视频照常走，图片和它的时间条保持不动。没有再加一套按钮或快捷键。

本版包含图片 / 视频同屏对比、跨网页本机素材库、原文件新增导入画布、默认 2 秒截取、末尾 / 反向截取、配乐起点与剪辑下载。普通网页默认显示小猫入口，安装不弹欢迎页，日夜模式直接可用。

**下载：** [MiorningSelect-v0.6.0.zip](https://github.com/miorning/miorning-select/releases/download/v0.6.0/MiorningSelect-v0.6.0.zip)

**配套封面：** [三款六张封面与文案](https://github.com/miorning/miorning-select/releases/download/v0.6.0/MiorningSelect-v0.6.0-covers.zip)。下载文件的校验值见同页 `SHA256SUMS.txt`。

解压后，在 Chrome / Edge 扩展管理页开启开发者模式，加载包内的 `extension` 文件夹。它是可直接加载的源码，无需编译，未上架扩展商店。详细步骤见 [README](README.md)。

**更新时不要先卸载。** 用新版 `extension` 内文件覆盖原安装目录，重新加载原扩展并刷新网页。缓存按浏览器资料和扩展 ID 保存；换目录不保证保留身份。请另行保存重要原文件，备份程序目录不等于备份媒体缓存。

### 范围与验证

- 图片 / 视频合计最多 16 条，片段最多 64 段；单文件缓存上限 250 MiB。
- 完整图片 / 视频交入使用原文件；快速单段原编码导出支持 H.264 / AVC MP4。多段合成及混音会重新编码。
- 动图只在对比预览中静止，缓存和回贴仍使用完整原文件。
- 本轮真实 Chrome MV3 测试覆盖图片对比、网页选择、原文件哈希、跨网页缓存、连续新增回贴，以及视频 / 音乐 / 快捷键回归。没有宣称完成独立 Edge 全量验收。
- 回贴依赖目标平台新增入口及格式支持；交入成功不等于平台上传或保存完成。生产平台尚未逐一验收，不自动点击聊天发送。
- 界面目前中文，文档提供中英双语。自有代码采用 GPL-3.0-only，允许商用；分发受 GPL 约束的版本须按许可证提供对应源码。第三方依赖见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## English

Images and videos can now share the same comparison view. Use the existing webpage selection and local import flows. Videos play normally while images and their timelines stay still. No additional buttons or shortcut bindings are introduced.

This release includes mixed-media comparison, a cross-page local library, original-file handoff to a canvas, default two-second trimming, final-two-second and backward selection, music start-point controls and editing/download. The cat appears on ordinary webpages by default, installation opens no welcome tab, and light/dark mode is free.

**Download:** [MiorningSelect-v0.6.0.zip](https://github.com/miorning/miorning-select/releases/download/v0.6.0/MiorningSelect-v0.6.0.zip)

**Promotional assets:** [Six covers and copy](https://github.com/miorning/miorning-select/releases/download/v0.6.0/MiorningSelect-v0.6.0-covers.zip). Checksums for both archives are in the attached `SHA256SUMS.txt`.

Extract the archive, enable Developer mode in Chrome / Edge's extension manager and load its `extension` folder. The source loads directly without a build step. The extension is not listed in a browser extension store. See the [installation guide](README.en.md).

**Do not uninstall before updating.** Replace files in the original installation directory with the new `extension` contents, reload the original extension, then refresh webpages. Cache belongs to a browser profile and extension ID; a different directory may produce a new identity. Keep important original media separately: a program-directory backup is not a media-cache backup.

### Scope and verification

- Up to 16 combined image/video items and 64 clips; the per-file cache limit is 250 MiB.
- Complete image/video handoff uses original bytes. Quick single-clip packet-copy export supports H.264 / AVC MP4. Multi-clip composition and mixing re-encode the output.
- Animated images remain still only in comparison previews; caching and handoff retain their complete original files.
- Real Chrome MV3 tests covered image comparison, page selection, original-file hashes, cross-page cache, repeated add-only handoff and video/music/shortcut regressions. A complete independent Edge validation is not claimed.
- Handoff depends on the target platform's add/upload input and format support. Handoff is not proof of successful upload or saving. Production platforms have not each been validated, and chat messages are never sent automatically.
- The UI is currently Chinese; documentation is bilingual. First-party code uses GPL-3.0-only, permits commercial use and requires corresponding source when distributing covered versions under the license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependencies.
