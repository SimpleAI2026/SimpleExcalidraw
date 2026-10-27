# 字体说明（P2.4 / B-13 / S-04 / S-05）

## 当前产品行为

- 手绘字体（`FONT_FAMILY` id `1`）CSS 栈： `Virgil, Zhushiti, HanziPen SC, Cangnanshoujiti, KaiTi`
- 浏览器按序回退：先 Virgil（拉丁），中文优先 `Zhushiti`（打包 TTF），再系统 `HanziPen SC` / `Cangnanshoujiti` / `KaiTi`。
- UI 仍只有上游三档：手绘 / 正常（Helvetica）/ 代码（Cascadia）。独立「中文字体选择」未做（README 未完成项）。

## 资源

| 家族 | 文件 | 备注 |
| --- | --- | --- |
| Zhushiti | `public/YangRenDongZhuShiTi-Light-2.ttf` | 已挂入 Virgil 回退；`font-weight: 400` |
| Cangnanshoujiti | `public/YeZiGongChangCangNanShouJi-2.ttf` | 同上 |
| Virgil / Cascadia / Assistant | `*.woff2` | 已是 woff2 |

## 未做（有意推迟）

- TTF → woff2 + 常用汉字子集（体积大，需单独构建流水线）
- 第四个字体选择按钮 / 可切换中文字体 UI

## 验收

1. 手绘工具输入中文，暗色/亮色下字形可读
2. DevTools → Computed `font-family` 含 `Zhushiti` 或后续回退
