# Source and verification / 源码与验证

The extension is distributed as directly editable JavaScript, HTML and CSS in `extension/`. No application compilation, remote script service or package installation is required to load it. The one bundled media dependency is documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), with its preferred source and reproducible wrapper in this repository.

插件本体是 `extension/` 内可直接编辑的 JS、HTML 与 CSS，无需编译即可加载。内置媒体依赖的来源、源码与包装方式见第三方说明。

## Local checks / 本地检查

Use Node.js 20+ and Python 3.9+ (standard library only):

```sh
npm test
npm run check
python scripts/package.py
```

On systems where Python is named `python3`, use `python3 scripts/package.py`. Node tests do not need `npm install`. Packaging writes a deterministic ZIP, a SHA-256 file and a manifest to `dist/`. Extract the generated ZIP and load its `extension/` directory in the browser, or load the repository's `extension/` directory directly.

可将上面的 `python` 换为本机的 `python3`。测试不需安装 npm 依赖。打包产物在 `dist/`；解压生成的 ZIP 后，加载其中的 `extension/` 文件夹，也可直接加载仓库里的 `extension/`。

The public engine tests use simulated media elements to exercise synchronization, seeking, mute/music selection and failure behavior. They are **not** a browser or website compatibility test. Additional v0.6.0 manual/browser verification is summarized in [docs/VALIDATION.md](docs/VALIDATION.md). Private browser profiles and selected user media are never part of this repository.

公开引擎测试使用模拟媒体对象验证同步、定位、声音选择和错误处理，不代表真实网页兼容性验收。真实浏览器验证范围见验证说明。仓库不含私人浏览器资料或用户选片缓存。
