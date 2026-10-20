# 🧮 Little Math 小小数学家

幼儿园/小学数学练习生成打印工具，帮助家长和老师快速生成适合低年级学生的数学练习题。

## ✨ 功能特点

### 📝 练习题生成

- **年级预设**：幼儿园、一年级、二年级、三年级，一键选择适合的难度
- **自定义范围**：支持自定义数字范围（如 1-10、1-100）
- **四则运算**：加法、减法、乘法、除法，支持混合运算
- **多种题型**：
  - 横式计算（支持 2 列 / 3 列布局）
  - 竖式计算
- **多种练习模式**：
  - 普通计算
  - 凑数练习（凑 10 / 凑 20 / 凑 100）
  - 连续运算（3-4 个数）
  - 比较大小
  - 有余数除法
- **填空位置**：支持配置留空位置比例
- **答案页**：可选生成答案页，方便批改

### 🎯 在线练习

- 即时答题反馈
- 计时功能
- 正确率统计
- 语音读题（支持的浏览器）
- 成就系统

### 📕 错题本

- 自动记录错题
- 错题复习功能
- 复习次数追踪

### 📊 使用统计

- 访问、生成、打印次数统计
- 运算类型使用分布
- 最近 7 天数据图表
- 练习进度追踪
- 数据导出（JSON/CSV）

### 🎨 其他特性

- **三种颜色**：🍬糖果 / 🌳森林 / 🌊海洋，覆盖所有页面；打印和 PDF 始终黑白省墨
- **配置持久化**：自动保存上次配置
- **儿童化设计**：彩色界面、可爱字体、趣味装饰
- **打印友好**：保留彩色样式，背景覆盖整页
- **移动端适配**：响应式设计，手机也能用

## 📐 出题规则

「数字范围」= 最小值～最大值，所有模式统一按下面的规则出题：

| 运算 | 规则 |
| --- | --- |
| 加法 a + b = c | a、b、c 都在范围内（和不超过最大值，例如「20 以内」和 ≤ 20） |
| 减法 a - b = c | a、b、c 都在范围内（不出负数；最小值 ≥ 1 时差不为 0） |
| 乘法 a × b = c | 积 c 在范围内；因数从 2 起，若 最小值² ≤ 最大值 则因数也 ≥ 最小值 |
| 除法 a ÷ b = c | 被除数 a 在范围内且整除；除数、商的规则同乘法因数 |
| 表内乘除（可选） | 因数 / 除数 / 商不超过 9 |
| 连续运算 | 按「先乘除、后加减」计算；每一步中间结果和答案都是 0～最大值 的整数；乘除因数从 2 起 |
| 比较大小 | 两边算式遵守上面的规则；「<」「>」「=」各约占 1/3 |
| 有余数除法 | 被除数在范围内，除数 2～9，余数 1～除数-1 |

- 0、1 这类「送分题」（+0、-0、×1、÷1、商为 1、结果为 0）只在范围包含它们时偶尔出现（约 8%）。
- 范围内的不同题目不够时，会先用完所有不同的题，再重复补足到总题数，并在预览上方提示。
- 设置有误（最小值 ≥ 最大值、留空、小数、题数越界、没选运算、范围内出不了题）时，输入框下方给出原因，且不能打印 / 导出。
- 卷面标题默认按实际设置自动生成（如「20以内加减法练习」），卷头还会写明范围与运算。

## 🖨️ 打印与导出

- 网页上的每一页就是一张 A4（210mm × 297mm），浏览器打印和「导出PDF」都是「一页卷子 = 一页 A4」。
- 每页最多题数：2 列 24 道、3 列 51 道、竖式 20 道；切换版式时超过上限会自动调小并提示。
- 竖式只用于普通计算和凑数练习，其它模式自动使用横式。
- 导出 PDF 的文件名日期按浏览器本地时间、在导出时计算。

## 🚀 快速开始

需要 **Node.js 22**（≥ 22.13）和 **pnpm 11**（`corepack enable` 后自动使用 package.json 里指定的版本）。

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 类型检查
pnpm check

# 单元测试（出题规则、校验、统计等）
pnpm test

# 端到端测试（Playwright：打印 / 导出 PDF 页数、版式不溢出等）
pnpm exec playwright install chromium   # 首次运行
pnpm test:e2e
```

## 📦 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 自动检测 SvelteKit，点击部署即可

## 🎨 界面预览

- 左侧配置面板：选择年级、运算类型、题数等
- 右侧预览区域：实时显示生成的练习题
- 点击「生成」刷新题目，点击「打印」调用浏览器打印
- 右下角统计面板：查看使用数据

## 🔧 技术栈

- [SvelteKit](https://kit.svelte.dev/) - 全栈 Web 框架
- [Svelte 5](https://svelte.dev/) - 使用 runes 语法（$state, $derived, $effect）
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Vite](https://vitejs.dev/) - 构建工具

## 🔒 安全

- **依赖安全**：在 `pnpm-workspace.yaml` 的 `overrides` 中强制升级 `cookie`、`tar` 到安全版本
  - 修复 CVE-2024-47764（cookie XSS），以及 tar 的路径遍历漏洞
  - 原因：`@sveltejs/kit` 2.x 依赖的 `cookie ^0.6.0` 存在漏洞
  - 注意：pnpm 10 起不再读取 `package.json` 里的 `"pnpm"` 字段，overrides 必须写在 `pnpm-workspace.yaml`（之前写在 package.json 里其实没生效，实际装的是 cookie 0.6.0）
  - 验证：`pnpm why cookie` 应只显示 `cookie@0.7.x`
  - 参考：https://github.com/advisories/GHSA-pxg6-pf52-xh8x

## 📁 项目结构

```
src/
├── lib/
│   ├── generators/       # 题目生成逻辑（纯函数，可注入随机数便于测试）
│   │   ├── rules.ts      # 各运算的范围规则
│   │   ├── validate.ts   # 配置校验
│   │   ├── worksheet.ts  # 统一出题入口、自动标题
│   │   ├── fill.ts       # 去重与补足
│   │   ├── arithmetic.ts # 加减乘除生成器
│   │   ├── chain.ts      # 连续运算生成器
│   │   ├── compare.ts    # 比较大小生成器
│   │   ├── makeTarget.ts # 凑数练习生成器
│   │   └── remainder.ts  # 有余数除法生成器
│   ├── config/
│   │   ├── presets.ts    # 年级预设配置
│   │   └── uiThemes.ts   # 三个界面主题（糖果/森林/海洋）
│   ├── components/       # UI 组件
│   │   ├── ConfigPanel.svelte      # 左侧配置面板
│   │   ├── ExerciseSheet.svelte    # 练习题显示/打印
│   │   ├── StatisticsPanel.svelte  # 统计面板
│   │   ├── PracticeConfig.svelte   # 练习配置
│   │   ├── PracticeResult.svelte   # 练习结果
│   │   ├── ProblemDisplay.svelte   # 题目显示
│   │   ├── AnswerInput.svelte      # 答案输入
│   │   ├── CompareInput.svelte     # 比较符号输入
│   │   ├── RemainderInput.svelte   # 余数答案输入
│   │   ├── Timer.svelte            # 计时器
│   │   ├── ProgressChart.svelte    # 进度图表
│   │   ├── UiThemeSwitcher.svelte  # 换颜色（主题切换）
│   │   └── AchievementToast.svelte # 成就提示
│   ├── actions/          # Svelte actions
│   │   └── track.ts      # 统计埋点 action
│   ├── services/         # 业务服务
│   │   ├── statistics.ts    # 统计服务
│   │   ├── configStorage.ts # 配置持久化
│   │   ├── wrongBook.ts     # 错题本服务
│   │   ├── achievements.ts  # 成就系统
│   │   ├── speech.ts        # 语音服务
│   │   └── export.ts        # 数据导出
│   ├── i18n/             # 国际化（预留）
│   │   └── zh.ts         # 中文文本
│   └── types.ts          # 类型定义
├── routes/
│   ├── +page.svelte      # 主页面
│   ├── +layout.svelte    # 布局组件
│   ├── practice/
│   │   └── +page.svelte  # 在线练习页面
│   └── wrong-book/
│       └── +page.svelte  # 错题本页面
```

## 📝 License

MIT
