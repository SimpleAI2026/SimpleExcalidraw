# 工具链说明（P2.7 / B-19）

## 包管理器

- 仓库 `yarn.lock` 为 **Yarn Classic v1**（文件头 `# yarn lockfile v1`）。
- `package.json` 声明 `"packageManager": "yarn@1.22.22"`。
- 本机若默认 `yarn` 为 4.x，会报 lockfile 不兼容；请改用 Yarn 1：
  - `npm i -g yarn@1.22.22`，或
  - `npx yarn@1.22.22 <script>`
- 根目录 `.yarnrc`（Classic）含 `ignore-engines true`。

## Node

- `engines.node`: `>=14`（上游 CRA 历史约束）。
- 推荐 Node **16–20** 跑 `yarn start` / `yarn test:typecheck`。
- Node 22+ / 25 可能与部分 `@types/*` 或旧 CRA 摩擦；未在本阶段强制升级依赖。

## Typecheck

- `yarn test:typecheck` → `tsc`
- 已知：部分依赖类型（如 `@types/d3-dispatch`）可能仍卡住全量 tsc；功能修复不与依赖大升级混做。
- 无现成 CI 工作流时不新增强制 CI；有 `.github/workflows` 时可再挂 `test:typecheck`。

## 验收

```bash
node -v
npx yarn@1.22.22 -v   # 期望 1.22.x
npx yarn@1.22.22 test:typecheck
```
