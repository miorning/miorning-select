# 隐私与本机数据 / Privacy and local data

适用版本 / Applies to: **v0.6.0**  
更新日期 / Updated: **2026-10-23**  
[简体中文说明](../README.md) · [English guide](../README.en.md)

## 中文

### 保存什么

喵咛选片台保存用户主动选入的图片、视频与配乐，以及原文件名称、可用的来源链接、媒体信息、顺序、片段范围、配乐设置和其他编辑状态。主题、猫头位置与快捷键等偏好也保存在本机。素材库可包含网页项目上下文和旧版项目记录，便于恢复与迁移。

文件和编辑状态位于当前浏览器资料、当前扩展 ID 的 IndexedDB，数据库名为 `miorning-select-persistence-v1`；偏好通过浏览器扩展存储保存。不自动跨设备同步，也没有项目运营的云端素材库。

### 什么时候访问网络或交出文件

- 用户选入在线素材后，插件会尝试从其来源读取完整文件以供本机缓存；在线媒体预览或截取也可能访问源地址。源站仍会收到正常网络请求。
- 用户点击「导入画布」或回贴片段时，插件将选定文件交给当前页面的新增上传、导入或附件入口。接收页面可能随后上传文件、转码或保留文件，这由该平台控制，适用其隐私规则。
- 插件不自动点击聊天「发送」，不把所有已缓存素材自动交给网页。普通页面不会因为猫头出现就得到整个素材库。
- 本版本没有项目自建上传服务、遥测或广告追踪接口，不读取账号密码。媒体处理依赖随包提供，不在运行时从第三方 CDN 下载执行脚本。

请不要把「本机保存」理解为所有操作都离线。未缓存的网络素材仍依赖来源可用；主动导入平台会把对应文件交给平台。来源链接或文件名也可能包含私人信息，请在公开截图、问题反馈或分享文件前检查。

### 权限用途

| 权限 | 用途 |
| --- | --- |
| HTTP/HTTPS 站点访问 | 在普通网页显示默认猫头；在用户操作后识别媒体、读取可访问的原文件并交入当前网页的新增入口。 |
| `activeTab` | 支持用户触发的当前标签页操作。 |
| `scripting` | 按需加载工作台与页面交互代码。 |
| `storage` | 保存主题、位置、快捷键等扩展设置。 |
| `unlimitedStorage` | 支持持久本机媒体库，降低常规存储配额和驱逐机制的影响；不表示磁盘空间无限。 |

浏览器设置页、扩展商店等受限页面不支持注入。可在浏览器扩展管理页调整站点访问权限；限制权限可能使默认入口、取源或回贴不可用。

### 容量、删除与卸载

单文件缓存上限 250 MiB，素材库最多包含 16 条图片 / 视频、1 条配乐与 64 个片段。无法缓存的在线素材会标记「仅链接 · 未缓存」，不会以有损压缩假装完成原文件保存。

右上角「⋯ → 本机素材与缓存」可查看实际媒体字节与文件数量。删除某个素材会释放对应文件和片段；确认「清空全部素材与缓存」会移除跨网页共用的素材、配乐、片段与旧记录，保留主题和快捷键。中断的缓存任务会清理不完整文件。它是浏览器数据删除操作，不承诺对底层磁盘进行安全擦除。

卸载扩展或清除扩展数据会删除本机缓存。更换浏览器、资料或扩展 ID 不会自动迁移这些数据。更新时保留原安装目录与扩展身份，不要先卸载；请自行保存重要原文件。

缓存由浏览器数据库管理，不是普通下载目录。界面可打开浏览器资料路径说明，不能直接打开任意系统文件夹；不要手动改写数据库文件。

## English

### What is stored

Miorning Select stores images, videos and music deliberately selected by the user, along with original filenames, available source URLs, media metadata, ordering, clip ranges, music settings and other editing state. Preferences such as theme, cat position and shortcuts are also stored locally. The library may retain webpage project context and legacy records for restoration and migration.

Files and editing state reside in IndexedDB for the current extension ID within the current browser profile, using the database `miorning-select-persistence-v1`. Preferences use browser extension storage. There is no automatic cross-device synchronization or project-operated cloud media library.

### When network requests or file handoffs occur

- Selecting online media may trigger a request to its source for local caching. Online preview and trimming may also access the source URL. The source server receives ordinary network requests.
- Choosing to import media or a clip hands the selected file to the current page's add/upload/attachment input. That page may then upload, transcode or retain it under its own behavior and privacy terms.
- The extension does not automatically press a chat Send button or hand every cached item to a webpage. Displaying the cat alone does not give a normal webpage the whole library.
- This release has no project-operated upload service, telemetry or advertising-tracking endpoint, and does not read account passwords. Media-processing dependencies are bundled locally rather than downloaded as executable scripts from a CDN at runtime.

Local storage does not mean every operation is offline. Uncached online media still needs its source, and an intentional platform import gives that platform the selected file. Source URLs and filenames may contain private information; review them before publishing screenshots, issue reports or shared files.

### Permission purposes

| Permission | Purpose |
| --- | --- |
| HTTP/HTTPS site access | Display the default cat on ordinary pages; after user interaction, identify media, read accessible source files and hand files to an add/upload input. |
| `activeTab` | Support user-triggered operations in the active tab. |
| `scripting` | Load the workbench and page-interaction code when needed. |
| `storage` | Save extension settings such as theme, position and shortcuts. |
| `unlimitedStorage` | Support the persistent local media library and reduce the impact of ordinary quota/eviction behavior. This does not mean disk capacity is unlimited. |

Restricted browser settings and extension-store pages cannot be injected into. Site access can be adjusted in the browser's extension manager; restrictions may prevent the default entry point, source reads or handoff from working.

### Capacity, deletion and removal

The per-file cache limit is 250 MiB. The library holds up to 16 image/video items, 1 music track and 64 clips. Online items that cannot be cached are marked **仅链接 · 未缓存** (Link only · Not cached); the extension does not use lossy compression to claim the original was saved.

Open **⋯ → 本机素材与缓存** (Local media and cache) for recorded media-byte totals and file counts. Deleting an item releases its file and clips. Confirming a full clear removes the shared library, music, clips and legacy records, while retaining theme and shortcuts. Interrupted cache tasks clean up incomplete files. This is browser-data deletion, not a guarantee of secure erasure of the underlying disk.

Uninstalling the extension or clearing its data deletes the local cache. Changing browsers, profiles or extension IDs does not automatically migrate it. Update in the original directory without first uninstalling, and keep important original media separately.

Cache lives in browser-managed databases rather than a regular downloads folder. The interface offers browser profile-path information; it cannot directly open arbitrary system directories. Do not modify database files manually.
