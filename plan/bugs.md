# 缺陷清单（Bugs）

约定：

- **Severity**：`critical` / `high` / `medium` / `low`
- **Status**：`open` / `fixed`（代码侧已落地；未必已 commit）
- **Evidence**：具体路径；必要时标 `hypothesis`

---

## Critical

### B-01 AI「简单流程」解析失败会用空 elements 覆盖当前画布

- **Severity**：critical
- **Status**：fixed（工作区）
- **Evidence**：`AiButton.tsx` — 空结果不再 `updater`；有替换/插入/新建确认
- **Notes**：勿按旧描述排障

### B-02 `REACT_APP_AI_SECRET` 打进前端包 + 明文写入 localStorage

- **Severity**：critical（安全）
- **Status**：fixed（代码路径）/ open（运维残留）
- **Evidence**：代码不再把 `REACT_APP_AI_SECRET` 当默认值；secret 进 sessionStorage
- **残留**：本机 `.env*.local` 仍可能含旧密钥（gitignore）；需人工轮换/清理（本轮按用户要求跳过）

### B-03 删除当前/最后一个画布可导致指向已删 key 或空列表

- **Severity**：critical
- **Status**：fixed（工作区）
- **Evidence**：`SwitchContainerDialog` + `containerLifecycle` 删画布兜底

---

## High

### B-04 画布重命名缺少校验

- **Severity**：high
- **Status**：fixed（工作区）

### B-05 `RESVERED_LOCALSTORAGE_KEYS` 不完整

- **Severity**：high
- **Status**：fixed / partial（工作区有校验增强；废弃别名仍在）

### B-06 选中多段线后无法继续拖中点折弯

- **Severity**：high（体验）
- **Status**：fixed（工作区）
- **Evidence**：`linearElementEditor.ts` `getEditorMidPoints` / `getSegmentMidpointHitCoords`；`renderScene.ts`；选中态也显示/命中各段中点；Hint 文案已改

### B-07 AI「插入」ID 重映射不全

- **Severity**：high
- **Status**：fixed（工作区）
- **Evidence**：`AiButton.tsx` `withNewIds` 现覆盖 `startBinding` / `endBinding` / `groupIds` / `frameId` / `containerId` / `boundElements`

### B-08 新建画布配额失败残留名单

- **Severity**：high
- **Status**：fixed（工作区）
- **Evidence**：`NewContainerDialog.tsx`、`AiButton.createNewCanvasWithElements`：先写 elements 再改 list，失败回滚；`containerLifecycle.newWithElements` 有 Quota toast

### B-09 AI 请求体对供应商不友好

- **Severity**：high
- **Status**：fixed（工作区）
- **Evidence**：`AiButtonAction.tsx` — `max_tokens` 按供应商收敛；`enable_thinking` 仅 SiliconFlow 类端点；默认模型改为 `gpt-4o-mini`

### B-10 PDF/md 灌入 Prompt 无体积/截断治理

- **Severity**：high
- **Status**：fixed（工作区）
- **Evidence**：上传 2MB 上限；截断到 9000 并 `aiPromptTruncated` 提示

---

## Medium / Low（仍 open）

- Mermaid 未支持类型走位图；`validateMermaid` 只 parse
- 无 CSP；`innerHTML = svg`
- API Key 仍在 sessionStorage（XSS 面）；BFF 仅文档
- `newScene`/`switchScene` 快捷键为空串
- antd Modal 与 Excalidraw 双体系未完全拆完
- 中文字体 TTF 未 woff2/子集；字体选择 UI 缺
- 上游部分单测 `it.skip`；`test:typecheck` 摩擦
- `plan/` 仍未入库

---

## 本轮未做（用户明确跳过）

- 清理 `.env*.local` 密钥 / 轮换 / 上 BFF
