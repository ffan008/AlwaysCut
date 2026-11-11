# OpenChatCut Pro UI 设计基准（1:1 复刻源）

> 来源：从运行中的 OpenChatCut Pro 3.1.0 本地服务 `http://127.0.0.1:3200` 抓取的完整前端资源
> 抓取时间：2026-11-11。资源：`dist/ui-probe/pro-assets/`（main CSS 210KB + 187 个 chunk JS 9.4MB + PaperMono 字体）

## 一、技术栈（Pro 前端）

| 层 | 技术 |
|---|---|
| 框架 | React（Tauri 2 WebView，本地 HTTP 服务 3200 端口） |
| 样式 | **Tailwind CSS v4** + **shadcn/ui** |
| 图标 | lucide-react |
| 动画 | motion（framer-motion 新名） |
| 通知 | sonner（toast） |
| 字体 | **Paper Mono**（可变等宽，100–800）+ PingFang SC / HarmonyOS Sans SC 回退 |

## 二、Dark 主题配色（默认主题，`<html class="dark">`）

### 语义色（shadcn 标准 + Pro 扩展）

| Token | 值 | 用途 |
|---|---|---|
| `--background` | `#0d0d0d` | 主背景（近纯黑） |
| `--foreground` | `#dedede` | 主文字 |
| `--card` | `#141414` | 卡片 |
| `--card-foreground` | `#dedede` | 卡片文字 |
| `--popover` | `#181818` | 弹层/菜单 |
| `--popover-hover` | `#262626` | 弹层 hover |
| `--popover-foreground` | `#f2f2f2` | 弹层文字 |
| `--secondary` | `#00253d` | 次要（深蓝底） |
| `--secondary-border` | `#002e4d` | 次要边框 |
| `--secondary-foreground` | `#3abcfd` | 次要文字（浅蓝） |
| `--muted` | `#333333` | 静默底 |
| `--muted-foreground` | `#8c8c8c` | 次要文字（灰） |
| `--accent` | `#242424` | hover/激活填充 |
| `--accent-foreground` | `#f2f2f2` | hover 文字 |
| `--border` | `#292929` | 边框/分隔线 |
| `--input` | `#0d0d0d` | 输入框底 |
| `--ring` | `gray` | 焦点环 |
| `--destructive` | `#ef4343` | 危险/删除（红） |
| `--destructive-foreground` | `#121212` | 危险文字 |
| `--constructive` | `#23d160` | 成功/建设性（绿） |
| `--constructive-foreground` | `#121212` | 成功文字 |
| `--caution` | `#f7b23b` | 警告（黄） |
| `--caution-foreground` | `#1a1a1a` | 警告文字 |

### 主色 `--primary`（多主题色，默认天蓝）

| 值 | 说明 |
|---|---|
| `#16a9f3` | **默认**（天蓝） |
| `#2f5bd3` | 深蓝 |
| `#5b9dff` | 亮蓝 |
| `#8b8dff` | 紫蓝 |
| `#ad501c` | 棕橙 |
| `#ee8b4d` | 橙 |
| `#f0a04b` | 琥珀橙 |

`--primary-foreground: #121212`（深色文字压在主色上）。

### 侧边栏 `--sidebar`

| Token | 值 |
|---|---|
| `--sidebar` / `--sidebar-background` | `#0f0f0f` / `#141414` |
| `--sidebar-foreground` | `#f2f2f2` |
| `--sidebar-accent` / `--sidebar-border` | `#333333` |
| `--sidebar-accent-foreground` | `#f2f2f2` |
| `--sidebar-primary` / `-foreground` | `#f2f2f2` / `#262626` |
| `--sidebar-ring` | `#d4d4d4` |

## 三、Light 主题配色（备查，非默认）

| Token | 值 |
|---|---|
| `--background` | `#f7f7f7` |
| `--foreground` | `#1c1c1c` |
| `--card` | `#ffffff` |
| `--popover` | `#ffffff` |
| `--primary` | `#16a9f3` |
| `--secondary` | `#f0f9ff` |
| `--secondary-foreground` | `#026ca2` |
| `--muted` | `#d9d9d9` |
| `--muted-foreground` | `#6e6e6e` |
| `--border` | `#e8e8e8` |
| `--destructive` | `#d71414` |
| `--constructive` | `#16833c` |
| `--caution` | `#935f06` |
| `--ring` | `#8c8c8c` |

## 四、字体

```css
--default-font-family: "Paper Mono", "PingFang SC", "HarmonyOS Sans SC",
  "Microsoft YaHei", "Hiragino Sans GB", ui-sans-serif, system-ui, sans-serif;
--default-mono-font-family: "Paper Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
--font-mono: 同上;
```

- **Paper Mono**：可变等宽字体，字重 100–800，是 Pro UI 的**标志性主字体**（等宽 UI 是核心辨识特征）。
- 字体文件已抓取：`dist/ui-probe/pro-assets/PaperMono-Variable.woff2`（53KB）。

## 五、布局 / 间距 / 圆角

```css
--spacing: 0.25rem;          /* 4px，Tailwind 间距基准 */
--radius-xl: 0.75rem;        /* 12px 大圆角 */
--scrollbar-size: 3px;       /* 超细滚动条 */
--default-transition-duration: 0.15s;
--ease-out-quart: cubic-bezier(...); /* 自定义缓动 */
```

`--frame-*` 系列（编辑器面板布局系统）：
- `--frame-radius: var(--radius-xl)`
- `--frame-px/py: calc(var(--spacing) * 0.75)`（3px）
- `--frame-panel-bg: var(--color-muted)`、`--frame-panel-border-color: var(--color-border)`
- 面板 header/footer 有独立的 px/py 微调变量（`--frame-panel-header-py` 等）

## 六、界面结构（已截图 + 路由）

| 路由 | 界面 |
|---|---|
| `/projects` | 首页/资料库（左侧导航：全部作品/资源库/参考工程/品牌库 + 工作空间；顶部工具栏；内容区） |
| `/agent-host` | AI Agent 宿主窗口（独立） |
| 设置页 | 能力总览 / 本地模型 / Agent 模型 / AI 生效能力 / 开放素材 |

### 顶部工具栏（右→左）
`EN 语言切换` · `快捷键` · `客服耳机` · `通知铃铛` · `书签/模板` · `下载最新版`（白底黑字主按钮）

### 主按钮风格
- 强调按钮：**白底黑字**（`--foreground` 底 + `--background` 字，深色主题下是高对比）
- 品牌库空状态：居中圆形图标 + 标题 + 说明 + 「＋ 创建品牌」按钮

## 七、AlwaysCut → Pro 复刻映射建议

| Pro token | AlwaysCut 现状 | 动作 |
|---|---|---|
| `--background #0d0d0d` | `--cc-bg #101010` | 新增 `pro` 皮肤覆盖 |
| `--card #141414` | `--cc-panel #181818` | 微调 |
| `--primary #16a9f3`(蓝) | `--cc-accent #dc7036`(珊瑚橙) | **主色从橙改蓝** |
| `--constructive #23d160` | `--cc-success #3fae6a` | 微调 |
| `--destructive #ef4343` | `--cc-danger #e06c60` | 微调 |
| Paper Mono 等宽主字体 | 无（系统字体） | 引入字体 + token |
| 3px 超细滚动条 | 默认滚动条 | 复刻 |

**核心差异只有两处**：① 主色（橙→蓝）② 等宽字体（Paper Mono）。其余暗色基调高度一致。
