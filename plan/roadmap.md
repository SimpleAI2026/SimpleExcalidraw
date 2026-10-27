# 分阶段改进路线图（Roadmap）

原则：先止血（数据丢失 / 密钥），再稳持久化与 AI，再打磨 UX/视觉与工具链。  
每项对应 [bugs.md](./bugs.md) / [ux-and-style.md](./ux-and-style.md)。实现阶段再改产品代码；本文件只做勾选计划。

---

## Phase 0 — Quick wins（1–3 天，低风险高收益）

目标：消除「一键丢图」和最明显的校验漏洞。

- [x] **P0.1 修复 AI 简单流程空场景覆盖**（B-01）
  - 解析失败 / `elements.length === 0` 时不 `updater`
  - 空 prompt、缺 api/model early-return
  - 生成按钮与扩写按钮统一 disabled 条件（U-03）
- [x] **P0.2 AI 生成前确认「将替换当前画布」**（B-08 / U-01）最小版：仅 Confirm，暂不做插入模式
- [x] **P0.3 多画布删除 fallback**（B-03）
  - 使用删除后的列表选下一画布
  - 禁止删除最后一个；必要时重建默认 `new`
- [x] **P0.4 重命名/新建共用校验**（B-04 / B-05 / B-16）
  - trim、非空、reserved 全集、重名
  - 修正 `canvasNameInvalid` 文案；修正 `RESVERED` 拼写（可顺带）
- [x] **P0.5 去掉或门禁生产环境的 `REACT_APP_AI_SECRET`**（B-02 止血）
  - 文档改为「仅用户填写 / 后端代理」
  - 停止把 secret 默认进 env 模板；轮换已暴露密钥
- [x] **P0.6 小清理**：`getContainerIdFromStorage` return（B-06）；AI/Mermaid 生产环境减少 `console.log`（B-18）；Animate `bodyStyle` → `styles`（B-11）

**验收**：手动测 — 坏 JSON 不丢图；删画布边界；重名到 `excalidraw-state` 被拒。

---

## Phase 1 — Medium（约 1–2 周）

目标：AI 与多画布主路径可靠，暗色/移动不翻车。

- [x] **P1.1 AI 请求可取消 + 超时文案**（U-02）
  - Modal 关闭 / 取消按钮 → `AbortController`
  - 错误展示 response status/body 摘要（B-15）
- [x] **P1.2 Mermaid 输入清洗 + 唯一 render id + DOM finally 清理**（B-07）
  - 生成前 `validateMermaid`；失败友好提示（B-14）
- [x] **P1.3 AI 结果模式：替换 / 插入 / 新建画布**（B-08 完整版）
- [x] **P1.4 localStorage 配额与保存失败可见**（B-09 / H-1）
  - `QuotaExceededError` → toast；可选导出备份提示
- [x] **P1.5 动画 Viewer 稳定**（B-10 / U-07）
  - 收窄 effect deps；loop cancel；暂停按钮或删死 props；空画布禁用；标题 i18n
- [x] **P1.6 暗色主题：替换硬编码色**（S-02 / S-01）
  - SwitchScene / InputPreview / Animate / AI footer 用 CSS 变量
  - antd `ConfigProvider` token 对齐 `--color-primary`
- [x] **P1.7 移动端**：AI Modal 全宽；工具栏 overflow（U-09 / S-06）
- [x] **P1.8 i18n 补齐**写死中文（U-05、Animate、模型 placeholder）

**验收**：暗色下三处 Modal 可读；手机 375 可完成一次 AI（mock）；动画开关无泄漏（Performance/定时器）。

---

## Phase 2 — Larger（数周，需设计取舍）

目标：架构级改进，避免继续堆 reload 与密钥进包。

- [x] **P2.1 多画布 in-app 切换**（U-04）
  - `flushSave` → load container → `updateScene`，去掉整页 reload
  - 可选：每画布独立 appState 切片（B-09）— 轻量 viewport（scroll/zoom）按画布持久化
- [x] **P2.2 文件存储与画布生命周期绑定**（B-09）
  - 删除画布时回收专属 `fileId`；统计各画布占用 — 已做 best-effort 按引用回收；全量占用统计 UI 未做
- [x] **P2.3 AI 密钥架构**（B-02 根治）
  - 自有 BFF 代理 SiliconFlow/OpenAI；浏览器只持用户会话或用户自带 key（明文不下发服务端默认 key）
  - 落地：secret → sessionStorage；剥离 localStorage 明文；`api/README.md` BFF 指引（无服务端则不做假 BFF）
- [x] **P2.4 字体产品化**（B-13 / S-04 / S-05）
  - woff2 + 子集；字体选择 UI 或明确回退文档；处理未用 `Zhushiti`
  - 落地：Zhushiti 纳入 Virgil 回退栈；修正 Light 字重；`plan/fonts.md`；woff2/子集与字体选择 UI 推迟
- [x] **P2.5 选择/碰撞手感**（B-12 / H-2）专项 + 测试 — `getHitTestThreshold` clamp + coarse pointer；未新增强制单测（引擎限制）
- [x] **P2.6 设计体系统一**：定制功能尽量复用 Excalidraw `Dialog`/`ToolButton`，缩小 antd 表面积（S-01 / S-07）
  - 落地：根级 antd `ConfigProvider` token 对齐 `--color-primary` + dark algorithm；未一次性拆光 antd Modal
- [x] **P2.7 工具链**（B-19）
  - 锁定包管理器（yarn 1 vs 4）、Node 版本；修好 tsc；CI 跑 `test:typecheck` + 关键单测
  - 落地：`packageManager: yarn@1.22.22`、`.yarnrc`、`plan/toolchain.md`；未强升 Node/修光依赖 tsc；无现成 CI 则未新加
- [x] **P2.8 元数据**：`package.json` repository、README 功能清单与实现对齐（B-17）

---

## 建议执行顺序（一句话）

`B-01 → B-03/B-04 → B-02 止血 → B-08 确认框 → B-07 Mermaid → 动画泄漏 → 暗色/移动 → 无 reload 多画布 → AI 代理。`

---

## 非目标（本规划明确不做）

- 不在本次规划中升级到上游最新 Excalidraw monorepo（可另立调研）
- 不在未确认前改协作协议 / Firebase 生产配置
- 不把 `plan/` 外的驱动式重构混进「修 bug」PR

---

## 进度记录

| 日期 | 备注 |
| --- | --- |
| 2026-10-27 | 初版计划写入 `plan/`（仅文档，未改产品代码） |
| 2026-10-27 (Asia/Shanghai) | **本机落地 Phase 0 全部 + Phase 1**：P0.1–P0.6、P1.1–P1.8；顺带 P2.8 repository + `RESERVED` 拼写。P1.6 用 CSS 变量替换硬编码色（未接 antd ConfigProvider token）；P1.7 AI Modal 小屏全宽 + 移动工具栏 `overflow-x: auto`。跳过 P2.1–P2.7。未 commit/push。 |
| 2026-10-27 (Asia/Shanghai) | **Phase 2 大项落地**：P2.1 in-app 多画布切换（CustomEvent + `containerLifecycle`，去 reload）；P2.2 删画布 best-effort fileId 回收；P2.3 secret→sessionStorage + `api/README.md` BFF 指引；P2.4 Zhushiti 回退栈 + `plan/fonts.md`（无 woff2 大改）；P2.5 hit-test threshold clamp/触控；P2.6 根级 antd ConfigProvider；P2.7 yarn classic 锁定与文档。未做完整 BFF 实现、字体子集、强制 CI、依赖级 tsc 大修。未 commit/push。 |
| 2026-10-27 (Asia/Shanghai) | **体验/可靠性补丁（未 commit）**：选中多段线可持续拖中点折弯；`withNewIds` 补 binding/group/frame；新建画布先写内容再改名单+回滚；AI `max_tokens`/`enable_thinking` 按供应商收敛；上传 2MB+9000 截断；Hint/笔误；`plan/bugs.md` 对齐。跳过密钥清理（用户要求）。 |
