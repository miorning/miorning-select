# 固定上游材料 / Pinned upstream materials

本目录保存 Mediabunny 1.62.0 的原始分发包与构建源码。它们不需要联网即可核验；安装扩展时不执行这些归档内的任何代码。

This directory preserves the original Mediabunny 1.62.0 npm artifact and build-source. They can be verified offline. Installing the extension does not execute code from these archives.

| File | 用途 / Purpose |
| --- | --- |
| `mediabunny-1.62.0.npm.tgz` | 官方 npm 包，包含实际采用的浏览器 CJS 产物 / Official npm package containing the browser CJS artifact used by the extension |
| `mediabunny-1.62.0.source.tar.gz` | 按官方固定提交重打包的核心源码：根文件及 src/shared/scripts / Repacked core source at the pinned commit: root files and src/shared/scripts |
| `mediabunny-1.62.0.provenance.json` | 版本、上游位置、哈希及源码核验信息 / Version, upstream locations, hashes and source verification |
| `mediabunny-1.62.0.source-manifest.json` | 全部保留及排除文件清单，每项含上游 Git blob 哈希 / Included and excluded file list with upstream Git blob hashes |
| `mediabunny-1.62.0.git-tree.json` | 官方递归 Git tree 元数据 / Official recursive Git tree metadata |
| `SHA256SUMS` | 两个归档的 SHA-256 / SHA-256 for both archives |

上游 tag `v1.62.0` 与 npm 1.62.0 的 `gitHead` 都指向 `03d524ffa1a1429616bcd4434f97714a77432bd7`。

Upstream tag `v1.62.0` and npm 1.62.0's `gitHead` both resolve to `03d524ffa1a1429616bcd4434f97714a77432bd7`.

## 验证 / Verify

在项目根目录运行，要求 Node.js 20 或更新版本，不需要安装依赖或网络：

Run from the repository root with Node.js 20 or later. No dependencies or network are required:

```sh
node scripts/vendor-mediabunny.cjs --check
```

同时检查两个归档的 SHA-256、npm 公布的 SHA-512 integrity，并逐字节比较现有 vendor JS 与许可证。

This checks both SHA-256 hashes, npm's published SHA-512 integrity, and byte-for-byte equality of the shipped vendor JavaScript and license.

重新生成已有包装产物 / Recreate the existing wrapped artifact:

```sh
node scripts/vendor-mediabunny.cjs --write
```

此步骤从固定 npm 产物产生包装，不是 TypeScript 编译。核心源码归档只保留根目录文件及 src/**、shared/**、scripts/**，排除可选 packages/** 编解码器、测试、示例、文档子目录和媒体；不是完整仓库快照。原始 scripts/ 仅作为参考，其中的完整构建命令还需要被排除的可选包。具体文件范围见 source-manifest.json。

This wraps the pinned npm artifact; it is not a TypeScript build. The core source archive retains root files and src/**, shared/** and scripts/**. Optional packages/** codecs, tests, examples, documentation subdirectories and media are excluded; this is not a complete repository snapshot. Original scripts/ are retained as references, and their full-build commands require excluded optional packages. See source-manifest.json for the precise scope.

## 编译核心库 / Compile the core library

解压核心源码后，可以使用本目录的 build-mediabunny-core.cjs。它沿用上游 scripts/bundle.ts 中核心浏览器压缩包的选项，只编译本扩展实际使用的 Mediabunny 核心。构建工具固定为上游锁文件中的 esbuild 0.25.1。将该工具装入一个独立临时目录即可，不需要在裁剪后的上游源码目录执行 npm install。

After extracting the core source, build-mediabunny-core.cjs uses the core minified browser options from upstream scripts/bundle.ts and compiles only the library used by this extension. Use esbuild 0.25.1, pinned by the upstream lockfile, installed in a separate temporary tools directory. Do not run npm install inside the reduced upstream source tree.

```sh
npm install --prefix ./build-tools --no-save --ignore-scripts esbuild@0.25.1
node third_party/build-mediabunny-core.cjs ./mediabunny-1.62.0-build-source ./build-tools/node_modules/esbuild ./build-output/mediabunny.min.cjs
```

编译结果保留上游 MPL 许可头；它还不是本扩展的外层包装。发行版验证采用上面的离线 --check，已核对归档及包装字节。本次发布没有执行 TypeScript 全新编译，不将这项源码重编译说明描述为已实测的字节可复现构建。

The compiler output retains the upstream MPL banner; it is not yet the extension wrapper. Release verification uses the offline --check above to verify archives and wrapped bytes. Fresh TypeScript compilation was not performed for this release, so this documented source-build path is not claimed as a tested byte-reproducible build.

许可证及 Larger Work 说明 / Licensing and Larger Work notice: [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
