![中文文档](./README.md)  
![English Document](./README.en.md)

SimpleExcalidraw 是 [Excalidraw](https://github.com/excalidraw/excalidraw) 的定制 fork：中文手写体、多画布、AI 生成、Mermaid 转换、绘图动画回放。

## 功能

- [x] 中文手写体（Zhushiti 回退栈）
- [x] 多画布（应用内切换，无需整页刷新；删除/重命名校验与兜底）
- [x] 多模板字段适配脚本
- [x] 更多颜色选项
- [ ] 边框样式
- [ ] 字体选择 UI（字体文件与回退已接入，选择器未做）
- [x] 移动端体验优化（AI Modal 小屏全宽、工具栏横向滚动等）
- [x] AI 生成（替换 / 插入 / 新建画布；可取消；PDF/md/txt/csv 灌入 Prompt）
- [x] Mermaid → Excalidraw 转换（输入清洗、唯一 render id）
- [x] 选中线段后可拖中点连续折弯
- [x] 绘图动画回放（可暂停 / 取消）
- [x] 暗色主题下定制 Modal 可读性

更细的缺陷与阶段规划见 [`plan/`](./plan/README.md)。

## 截图

![](./dev-docs/images/ScreenShot1.png)  
![](./dev-docs/images/ScreenShot2.png)

## AI 助手说明

1. 打开 AI 助手，填写 **API 地址**、**模型**；**密钥**在面板中粘贴（仅存当前标签页的 `sessionStorage`，关页即清）。
2. 生成结果可选 **替换当前画布 / 插入当前画布 / 新建画布**；空结果不会清空画布。
3. 可上传 `.md` / `.txt` / `.csv` / `.pdf`（单文件 ≤ 2MB，Prompt 最长约 9000 字，超限会截断并提示）。
4. 生产环境建议走自有 BFF，不要把密钥写进前端环境变量；指引见 [`api/README.md`](./api/README.md)。

## 环境变量（可选默认值）

```bash
# 可选：默认接口与模型（会打进前端包，勿放密钥）
REACT_APP_AI_API=https://api.openai.com/v1/chat/completions
REACT_APP_AI_MODEL=gpt-4o-mini
```

> **不要**设置 `REACT_APP_AI_SECRET`：CRA 会把它打进浏览器 JS。密钥请在 AI 面板填写，或由后端代理注入。

## 使用地址

https://excalidraw-phi-woad.vercel.app/

## 本地安装

### 环境要求

- [Node.js](https://nodejs.org/en/)（仓库 `.nvmrc` 为 14；实际开发可用更高 Node，建议 ≥ 18）
- [Yarn Classic v1](https://yarnpkg.com/getting-started/install)（**不要用 Yarn Berry / 2+**；本仓库 lockfile 为 v1，见 `.yarnrc`）
- [Git](https://git-scm.com/downloads)

若本机 `yarn -v` 显示 2.x+：

```bash
npm i -g yarn@1.22.22
# 或临时：npx yarn@1.22.22
```

### 克隆与启动

```bash
git clone https://github.com/linkxzhou/SimpleExcalidraw.git
cd SimpleExcalidraw
yarn
yarn start   # 等同 yarn dev；默认 http://localhost:3000
```

### 协作

如需实时协作，需自行部署 collab server：https://github.com/excalidraw/excalidraw-room

### 常用命令

| 命令                  | 说明                       |
| --------------------- | -------------------------- |
| `yarn` / `yarn start` | 安装依赖 / 本地开发        |
| `yarn build`          | 生产构建                   |
| `yarn fix`            | Prettier + ESLint 自动修复 |
| `yarn test`           | 跑测试                     |
| `yarn test:update`    | 更新测试快照               |
| `yarn test:code`      | 仅检查 ESLint              |

### Docker Compose

不想本地装 Node 时：

```sh
docker-compose up --build -d
```

## 动画实现（简要）

模块在 `src/animate/`：把画布导出为 SVG，按路径长度分配时长，用 WAAPI（`stroke-dashoffset` 等）回放笔迹；支持播放 / 暂停 / 取消 / 循环。入口为 `AnimateApp.tsx`（Modal），核心逻辑在 `animate.ts`。

## 项目来源

1. https://github.com/korbinzhao/excalidraw-cn
2. https://github.com/excalidraw/excalidraw
3. https://github.com/dai-shi/excalidraw-animate
4. https://github.com/sindrel/excalidraw-converter
