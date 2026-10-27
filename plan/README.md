# SimpleExcalidraw 改进计划索引

本目录仅包含**调查与规划文档**，不包含产品代码改动。分析基于仓库当前 `master` 分支源码阅读（未启动长时服务、未安装新依赖）。

## 项目速览

| 项 | 说明 |
| --- | --- |
| 定位 | Excalidraw fork / 定制版（中文手写体、多画布、AI 生成、动画回放、Mermaid 转换） |
| 栈 | React 18 + TypeScript + CRA (`react-scripts` 5) + roughjs + jotai；定制 UI 混用 antd 6 |
| 入口 | `src/index.tsx` → `src/excalidraw-app/index.tsx` → `src/packages/excalidraw` / `src/components/App.tsx` |
| 定制重点 | `src/components/AiButton*.tsx`、`src/mermaid-to-excalidrawjson/`、`src/animate/`、`src/excalidraw-app/data/localStorage.ts`（多画布）、中文字体 `public/fonts.css` |
| 远程 | `git@github.com:linkxzhou/SimpleExcalidraw.git`（`package.json` 的 `repository` 字段仍写着旧名 `excalidraw-plus`，建议后续对齐） |

## 阅读顺序（建议）

1. **[bugs.md](./bugs.md)** — 按严重级别排列的缺陷与假设；优先消化 **critical / high**
2. **[ux-and-style.md](./ux-and-style.md)** — 交互与视觉问题；与 bugs 中「无确认覆盖」等条目交叉阅读
3. **[roadmap.md](./roadmap.md)** — 分阶段落地顺序（quick wins → medium → larger）

## 优先级总览

> Phase 0–2 主路径多数已在 `master` 落地；下表保留历史优先级，**以 [bugs.md](./bugs.md) 的 Status 为准**。

| 优先级 | 主题 | 状态（概览） |
| --- | --- | --- |
| P0 | AI 空结果清空画布；密钥进 bundle/localStorage | 代码侧 fixed；`.env*.local` 运维残留另清 |
| P0 | 多画布删除/重命名边界 | fixed |
| P1 | AI 确认/插入/新建、Mermaid、动画泄漏、暗色 Modal | fixed |
| P1 | 折线中点、插入 ID 重映射、配额回滚、请求体/上传治理 | fixed |
| P2 | 字体选择 UI、完整 BFF、CSP、antd 表面积 | 部分 open |
| P3 | 空快捷键、a11y、工具链 tsc | open |

## 分析边界 / 阻塞

- **已做**：结构梳理、定制模块精读、持久化与 AI/动画/多画布路径交叉核对；轻量 `tsc` 尝试。
- **未做**：完整测试套件、浏览器实机回归、真实 AI 请求、协作服务器联调。
- **阻塞/摩擦**：
  - `yarn test:typecheck` 因 Yarn 4 / lockfile 不匹配失败（项目 `.nvmrc` 为 Node 14、依赖 yarn classic 风格）。
  - 直接跑 `./node_modules/.bin/tsc` 在 `node_modules/@types/d3-dispatch` 上报语法错误（依赖类型与 TS 4.9 不兼容，属工具链问题，未必是业务代码错误）。
  - 未读取 `.env*.local` 中的真实密钥内容（已确认存在 `REACT_APP_AI_SECRET` 配置位，属风险面）。

## 文档维护

实现修复时请回写本目录：勾选 `roadmap.md` 步骤、在 `bugs.md` 将已修项标为 fixed，并避免在 `plan/` 之外做无关重构（除非明确进入实现阶段）。
