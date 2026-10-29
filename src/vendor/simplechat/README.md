# Vendored SimpleChat browser build

由 SimpleChat `yarn build:min` 生成（请勿手工编辑 min.js）。

重建并拷贝：

```bash
cd ../SimpleChat && yarn build:min --no-copy
cp dist/simplechat.min.js ../SimpleExcalidraw/src/vendor/simplechat/simplechat.min.js
```

该 ESM 副作用会注册 `<simple-chat>`，并导出宽度辅助函数（`loadSidebarWidth`、`clampSidebarWidth`、`SC_WIDTH_*` 等）。

本仓库**不使用** npm portal / `@simplechat/*` 包，仅 vendor 此文件。
