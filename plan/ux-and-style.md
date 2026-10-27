# UX 与视觉问题

优先级：`P0`（立刻影响安全/数据）> `P1`（核心流程摩擦）> `P2`（打磨）> `P3`（债务）

与 [bugs.md](./bugs.md) 重叠的条目会交叉引用，本文侧重**交互与观感**。

---

## UX / 交互

### U-01 AI 生成无「将覆盖画布」确认，也无插入模式 — P0

- **现象**：点「简单流程 / 复杂生成」成功后直接 `updater` 整表替换；失败时甚至可能清空（见 B-01）
- **路径**：`src/components/AiButton.tsx`
- **方向**：生成前 Confirm（展示将替换 N 个元素）；提供 替换 / 插入 / 新建画布；失败绝不改场景

### U-02 AI 等待 3–5 分钟反馈不足 — P1

- **现象**：工具栏 title 写了「生成时间需要3–5分钟」（`locales/zh-CN.json` `toolBar.aiAssistant`），但 Modal 内仅 Button `loading`，无进度、无取消、无超时文案
- **路径**：`AiButton.tsx`；`requestCompletions` 支持 `signal` 但 UI **未传 AbortController**
- **方向**：显示「请求中…可取消」；超时提示；关闭 Modal 时 abort；勿把耗时写进 toolbar title（改到 Modal 说明区）

### U-03 空 Prompt 仍可点生成（只 toast 不阻断） — P1

- **路径**：`handleExcalidrawSubmit` / `handleMindSubmit`
- **方向**：校验失败 early-return；按钮 `disabled={!textAreaValue.trim() || isAnyLoading}`（扩写按钮已有类似逻辑，生成按钮应对齐）

### U-04 多画布切换靠 `location.reload()` — P1

- **现象**：新建 / 切换 / 删除均整页刷新（`NewContainerDialog.tsx`、`SwitchContainerDialog.tsx`）
- **摩擦**：闪白、丢失未防抖落盘的最后一次编辑（虽有 debounce 300ms，仍有竞态）
- **方向**：中期改为 in-app 切换：flushSave → 读目标 container → `updateScene`；保留 reload 作 fallback

### U-05 删除画布确认文案写死中文，且可删光 — P1

- **路径**：`SwitchContainerDialog.tsx` — `Popconfirm title={\`确定删除 ${scene} 吗?\`}`
- **方向**：走 i18n；禁止删除唯一画布；当前画布删除需二次确认并说明会丢内容

### U-06 画布重命名入口不明显 + 无校验反馈 — P1

- **路径**：`InputPreview` 灰色 `#999` 文本，点击才编辑；非法名无提示（B-04）
- **方向**：placeholder/「重命名」提示；校验失败 message；与菜单「新建/切换」视觉成组

### U-07 动画播放器缺暂停、标题未 i18n、无空画布提示 — P2

- **路径**：`AnimateApp.tsx` title `"Excalidraw 动画"`；`AnimateConfig` 有 pause props 无 UI；空 elements 仍开 Modal
- **方向**：i18n；补暂停/进度；空画布禁用 Animate 按钮并 tooltip

### U-08 快捷键 newScene / switchScene 为空 — P2

- **路径**：`src/actions/shortcuts.ts` — `getShortcutKey("")`
- **方向**：补合理快捷键或菜单不显示空 shortcut

### U-09 移动端工具栏拥挤（Animate + AI 挤进 mobile toolbar） — P2

- **路径**：`MobileMenu.tsx` 与桌面 `LayerUI` 同样塞入 Animate/AI
- **方向**：移动端收入 overflow 菜单；AI Modal `width={800}` 在小屏应 `100%`（虽有 `isSmallScreen` 调 footer，Modal 宽度未自适应）

### U-10 AI 设置（API/Key/Model）与提示词同屏，认知负担大 — P2

- **方向**：默认折叠「高级设置」；常用用户只见 Prompt + 生成；首次引导填 Key

### U-11 无障碍（a11y）— P3

- **现象**：自定义 Dialog/List 多靠点击 `span`；`ErrorDialog` 自带 TODO（焦点）；Switch 列表删除图标缺少清晰 `aria-label`
- **方向**：可聚焦按钮、键盘删除确认、焦点陷阱与 Excalidraw Dialog 对齐

---

## 视觉 / Style

### S-01 双设计系统：Excalidraw Island vs antd 6 — P1

- **现象**：AI Modal、动画 Modal、画布列表、InputPreview 使用 antd；主 UI 为 Excalidraw SCSS（`--color-primary` 等）
- **路径**：`AiButton.tsx`、`AnimateApp.tsx`、`SwitchContainerDialog.tsx`、`InputPreview`
- **问题**：圆角/字号/主色（硬编码 `#6965db`）与主题变量不完全一致；暗色主题下 antd 默认浅色组件突兀
- **方向**：短期用 `ConfigProvider` 映射 token 到 Excalidraw CSS 变量；长期能复用 `Dialog`/`Button` 的尽量不用 antd

### S-02 暗色主题下硬编码浅色 — P1

| 位置 | 硬编码 |
| --- | --- |
| `SwitchContainerDialog.tsx` | `#333` / `#e2e2e2` / `green` |
| `InputPreview` | `color: #999` |
| `AnimateApp.tsx` | `#fafafa` / `#f0f0f0` |
| `AiButton.tsx` | `#e3e2fe` / `#fafafa` mask 渐变 |

- **方向**：改用 `var(--color-*)` / `var(--text-primary-color)` / theme 感知

### S-03 AI Modal 视觉「营销风」与编辑器不一致 — P2

- mask 渐变、footer `#fafafa`、多处 inline style
- **方向**：收敛到主题色；减少 inline；与 `Dialog.scss` 对齐间距（4/8/16）

### S-04 中文字体与字重声明可疑 — P2

- `fonts.css`：`Zhushiti` / `Cangnanshoujiti` 均标 `font-weight: 700`，文件名却含 Light
- 未进可选字体 UI（README 未完成项）
- **方向**：修正 weight；提供字体选择或明确「仅作 Virgil 中文回退」

### S-05 大型 TTF 静态资源 — P2

- `YangRenDongZhuShiTi-Light-2.ttf`、`YeZiGongChangCangNanShouJi-2.ttf` 未转 woff2（同目录其它字体已是 woff2）
- **方向**：转 woff2、子集化常用汉字，改善首屏

### S-06 动画 Modal 90% 宽 + 80vh，小屏易溢出控件 — P2

- **方向**：响应式高度；控件换行（`AnimateConfig` 已是 row，窄屏需 wrap）

### S-07 CSS / 主题债务 — P3

- 定制功能大量 inline style，难维护暗色/高对比
- `excalidraw-app/index.scss` 与组件 scss 并存，antd 无统一入口主题
- **方向**：为 AI/多画布/动画抽一层 `*.scss` 使用 CSS 变量；加简单 visual checklist（亮/暗、桌面/375px）

---

## 文案 / i18n

| 问题 | 位置 | 方向 |
| --- | --- | --- |
| 动画标题中文写死 | `AnimateApp.tsx` | `t("other.animatePlay")` 等 |
| 删除确认中文写死 | `SwitchContainerDialog` | locales |
| 模型 placeholder「选择或输入模型名称」写死中文 | `AiButton.tsx` | locales |
| `canvasNameInvalid` 与真实规则不符 | `zh-CN.json` | 与校验对齐 |
| AI toolbar 把耗时塞进 title | `toolBar.aiAssistant` | 拆到帮助文案 |

---

## 建议验收场景（UX）

1. 亮色 / 暗色下打开 AI、动画、切换画布列表，检查对比度与按钮可点区域
2. 375px 宽：工具栏不换行撑破、AI Modal 可滚动、动画控件可见
3. 有内容画布上点 AI 生成失败 / 取消，画布元素数量不变
4. 唯一画布不可删除；重名为 reserved key 被拒绝并提示
5. 键盘可完成：打开 AI → Tab 到 Prompt → Esc 关闭且 abort 请求

