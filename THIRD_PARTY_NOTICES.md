# 第三方组件 / Third-party notices

## Mediabunny 1.62.0

- 上游作者 / Upstream: Vanilagy and contributors
- 项目 / Project: <https://github.com/Vanilagy/mediabunny>
- 原始许可证 / Original license: **Mozilla Public License 2.0 (MPL-2.0)**
- 完整许可证 / License text: [extension/vendor/mediabunny-1.62.0.LICENSE.txt](extension/vendor/mediabunny-1.62.0.LICENSE.txt)
- 固定版本 / Pinned tag: `v1.62.0`
- 对应提交 / Corresponding commit: `03d524ffa1a1429616bcd4434f97714a77432bd7`
- 源码归档、npm 包、哈希和重建说明 / Source archives, npm artifact, hashes and reconstruction: [third_party/README.md](third_party/README.md)

### 中文

本扩展使用 Mediabunny 读取和重新封装压缩视频包。`extension/vendor/mediabunny-1.62.0.js` 内的压缩浏览器 CJS 内容与官方 npm 1.62.0 包一致，只在外层增加 `globalThis.MSMediaPackets` 包装；原库代码未修改。包装代码也按 MPL-2.0 提供。应用自身的集成逻辑位于 `extension/lossless.js`，属于本项目 GPL-3.0-only 代码。

本项目作为 GPL-3.0-only 的 Larger Work 分发。依据 MPL 2.0 第 3.3 节，随此 Larger Work 分发的 Mediabunny 代码及本项目包装代码同时按 MPL-2.0 和 GPL-3.0 提供；保留原始 MPL 权利、版权声明和许可文本，不以项目的 GPL 标识取代它们。核验固定版本的构建源码时，未发现“与次级许可证不兼容”的文件声明（许可证正文内的示例 Exhibit B 不代表该声明已应用）。接收者可按适用的 MPL 或 GPL 条款使用这些部分。上游未因此改为只提供 GPL 许可。

官方 npm 包包含预构建产物，但缺少部分 `shared/` 源文件及上游构建脚本。因此本仓库另外附带上述提交的构建源码归档，包含 `src/`、`shared/`、`scripts/` 和 `package-lock.json`，而不是把 npm 包称为完整可构建源码。npm 归档保持原样。核心构建源码归档由该提交的原始文件重新打包，只保留根目录文件以及 src/、shared/、scripts/。可选 packages/ 编解码器、测试、示例、文档子目录和媒体均排除；保留的每个文件均按 Git blob SHA-1 核验。它不是完整仓库快照。上游材料继续遵循各自声明，不归为本项目原创内容。

`scripts/vendor-mediabunny.cjs` 本身按 GPL-3.0-only 提供；脚本内用于生成包装层的两段字符串另外按 MPL-2.0 提供。此脚本在离线验证归档哈希后，从 npm 包重新产生本扩展所用的同一包装产物，不执行 npm 生命周期脚本，也不声称重新编译了上游 TypeScript。核心 TypeScript 重新编译方法见 `third_party/README.md` 和 `third_party/build-mediabunny-core.cjs`。归档内原始 scripts/ 作为上游构建参考保留；它们部分引用被排除的可选包，不能把这份核心归档当作完整上游工程运行全部构建、测试或文档命令。

### English

The extension uses Mediabunny to read and remux compressed video packets. The minified browser CJS payload in `extension/vendor/mediabunny-1.62.0.js` is unchanged from the official npm 1.62.0 artifact, enclosed in a `globalThis.MSMediaPackets` wrapper. The wrapper is also available under MPL-2.0. Product-specific integration in `extension/lossless.js` is this project's GPL-3.0-only code.

This project is distributed as a GPL-3.0-only Larger Work. Under section 3.3 of MPL 2.0, the Mediabunny code and our wrapper included in this Larger Work are additionally distributed under GPL-3.0, while remaining available under MPL-2.0. The original MPL rights, copyright notices and license text remain intact. Inspection of the pinned build-source found no file notice declaring incompatibility with secondary licenses; the example Exhibit B in the license text is not an applied notice. Recipients may use these portions under the applicable MPL or GPL terms. This does not change the upstream project to GPL-only.

The npm artifact contains prebuilt outputs but omits some `shared/` sources and upstream build scripts. This repository therefore also carries a build-source archive assembled from unmodified files at the pinned commit, including `src/`, `shared/`, `scripts/` and `package-lock.json`. We do not describe the npm artifact alone as complete buildable source. The npm archive is unchanged. The core build-source archive retains only root files and src/**, shared/** and scripts/**. Optional packages/** codecs, tests, examples, documentation subdirectories and media are excluded. Every retained file was verified against its Git blob SHA-1. It is not a complete repository snapshot. Upstream materials retain their own notices and are not claimed as original work of this project.

`scripts/vendor-mediabunny.cjs` itself is GPL-3.0-only; its two strings containing the emitted wrapper are separately available under MPL-2.0. After verifying archive hashes offline, it recreates the exact extension wrapper from the npm artifact. It neither runs npm lifecycle scripts nor claims to recompile upstream TypeScript. For core TypeScript compilation, see `third_party/README.md` and `third_party/build-mediabunny-core.cjs`. Original scripts/ files are retained as upstream build references; some refer to excluded optional packages, so this core archive cannot run every upstream build, test or documentation command as a complete checkout would.

Official guidance: [MPL 2.0 section 3.3](https://www.mozilla.org/en-US/MPL/2.0/), [Mozilla's MPL-in-GPL developer guidelines](https://www.mozilla.org/en-US/MPL/2.0/combining-mpl-and-gpl/).
