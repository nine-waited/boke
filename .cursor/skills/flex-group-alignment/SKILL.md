---
name: flex-group-alignment
description: >-
  CSS flex 三场景：多组件底边对齐、组内单组件独立纵向偏移、多组件整体在父容器纵向居中。
  Use when aligning toolbar/header rows, logo + text + icon, flex-end vs center,
  translateY per-item offset, or user mentions 底部对齐、纵向居中、单独移动、flex 对齐.
---

# Flex 组对齐三场景

处理「一行多个元素既要彼此对齐、又要整体居中、还要单独微调某一个」时使用本 skill。

## 场景判定

| 用户需求 | 场景 | 方案 |
|---------|------|------|
| A、B、C 底边/基线对齐 | **多组件底部对齐** | 内层 `align-items: flex-end` |
| 只移动 B，不动 A、C | **单组件独立纵向移动** | 目标元素 `transform: translateY()` |
| A+B+C 作为整体在顶栏/父容器居中 | **多组件纵向居中** | 外层 `align-items: center` + 内层分组 |

**三个需求同时存在** → 用 **双层 flex**（见「组合模式」）。

---

## 场景 1：多组件底部对齐

多个子元素（Logo、文本、图标）底边对齐，**不要**用 `align-items: center`（会让小字号元素视觉上偏高）。

```css
.row {
  display: flex;
  flex-direction: row;
  align-items: flex-end; /* 底边对齐 */
  gap: 8px;
}
```

注意：
- 子元素各自 `line-height: 1`，避免行高撑高对齐基准
- 字号不同时底边对齐通常比 `baseline` 更符合「底部对齐」视觉预期
- **不要**在子元素上用 `font: inherit` 放在 `font-size` 后面，会覆盖字号

---

## 场景 2：单组件独立纵向移动

在共享 flex 行里**只移动一个子元素**，不影响 siblings。

### ✅ 推荐：`transform: translateY()`

```css
.item-offset {
  transform: translateY(var(--item-offset-y, 0));
}
```

```tsx
// 常量集中管理，组件 inline style 确保热更新生效
export const LAYOUT = { itemOffsetYPx: 2 } as const;

export function itemStyle(): CSSProperties {
  const { itemOffsetYPx } = LAYOUT;
  if (itemOffsetYPx === 0) return {};
  return { transform: `translateY(${itemOffsetYPx}px)` };
}
```

- **正数** = 下移，**负数** = 上移
- `transform` 不参与 flex 尺寸计算，不会挤动邻居

### ❌ 避免：仅用 `margin-top` 在 `flex-end` 行内

`align-items: flex-end` 下 `margin-top` 常几乎看不出变化或表现不稳定。

### ❌ 避免：CSS 变量写在错误层级

`calc((1em - 15px) / 2)` 若写在小子元素上，`1em` 会按**该元素字号**解析（如 11px），不是 Logo 的 14px。

---

## 场景 3：多组件整体纵向居中

整组在父容器（顶栏、header）内垂直居中，**同时**保持组内底边对齐 → 必须 **分组**。

```html
<div class="parent">          <!-- 外层：整体居中 -->
  <div class="group">         <!-- 内层：组内底对齐 -->
    <span class="logo">…</span>
    <div class="path-group">…</div>
  </div>
</div>
```

```css
.parent {
  display: flex;
  align-items: center;   /* 场景 3：整体纵向居中 */
  padding: 8px 12px;
}

.group {
  display: flex;
  align-items: flex-end; /* 场景 1：组内底边对齐 */
  gap: 8px;
  min-width: 0;
  flex: 1;
}
```

**不要**在同一层 flex 上同时要求「整体居中」和「彼此底对齐」——`align-items` 只有一个值，会互相打架。

---

## 组合模式（三场景同时满足）

Boke 顶栏参考实现：

| 文件 | 作用 |
|------|------|
| `App.tsx` | `boke-toolbar-side` > `boke-toolbar-leading` > Logo + Path |
| `styles.css` | `.boke-toolbar-side { align-items: center }`、`.boke-toolbar-leading { align-items: flex-end }` |
| `toolbar-path-layout.ts` | `copyOffsetYPx` + `copyButtonStyle()` |
| `VaultPathCopyButton.tsx` | `style={copyButtonStyle()}` 仅移动复制图标 |

```css
.boke-toolbar-side {
  display: flex;
  align-items: center; /* 场景 3 */
}

.boke-toolbar-leading {
  display: flex;
  align-items: flex-end; /* 场景 1 */
  gap: 8px;
}

.boke-toolbar-path-group {
  display: inline-flex;
  align-items: flex-end; /* 路径 + 复制图标底对齐 */
}

.boke-toolbar .boke-toolbar-path-reveal {
  transform: translateY(var(--boke-toolbar-path-copy-offset-y, 0)); /* 场景 2 备用 */
}
```

---

## 实施检查清单

- [ ] 判定是单场景还是组合场景
- [ ] 组合场景是否已加 **wrapper**（外层 center / 内层 flex-end）
- [ ] 单元素偏移是否用 **`translateY`**（而非仅 margin）
- [ ] 偏移常量是否放在 **layout 配置文件** + 目标组件 `style`
- [ ] 是否避免 `font: inherit` 覆盖 `font-size`
- [ ] 改完后提醒用户 **Ctrl+R**（Tauri/Vite 有时 CSS 变量不热更新）

## 调试

样式「改了没变化」时依次检查：

1. 是否运行开发版（非旧安装包）
2. 是否有更高优先级规则覆盖（如 `font: inherit`、子选择器 `max-width: none`）
3. flex 父级 `align-items` 是否与预期场景一致
4. 1px 偏移在高 DPI 下可能不明显，可暂改 3px 验证机制是否生效
