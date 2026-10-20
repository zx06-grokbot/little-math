# Little Math 开发指南

小小数学家 - 幼儿园/小学数学练习生成打印工具

## 命令

需要 Node.js 22+ pnpm 11（corepack）。

```bash
pnpm install    # 安装依赖
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产版本
pnpm check      # 类型检查
pnpm test       # 单元测试（vitest，src/**/*.test.ts）
pnpm test:e2e   # 端到端测试（Playwright，tests/e2e；检查打印 / PDF 页数与版式）
pnpm preview    # 预览构建结果
```

## 项目结构

```
src/
├── lib/
│   ├── generators/       # 题目生成逻辑（纯函数）
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
│   │   ├── statistics.ts    # 统计服务（localStorage）
│   │   ├── configStorage.ts # 配置持久化服务
│   │   ├── wrongBook.ts     # 错题本服务
│   │   ├── achievements.ts  # 成就系统服务
│   │   ├── speech.ts        # 语音朗读服务
│   │   └── export.ts        # 数据导出服务
│   ├── i18n/             # 国际化预留
│   │   └── zh.ts         # 中文文本
│   └── types.ts          # 类型定义
├── routes/
│   ├── +page.svelte      # 主页面（单页应用）
│   ├── +layout.svelte    # 布局组件
│   ├── practice/
│   │   └── +page.svelte  # 在线练习页面
│   └── wrong-book/
│       └── +page.svelte  # 错题本页面
```

## 架构原则

- **生成逻辑与 UI 分离**：generators/ 下的函数为纯函数，不依赖 Svelte
- **类型优先**：修改功能前先阅读 types.ts
- **Svelte 5 语法**：使用 runes（$state, $derived, $effect）
- **服务层封装**：业务逻辑封装在 services/ 下，组件只调用服务

## 核心类型

```typescript
type Operation = 'add' | 'sub' | 'mul' | 'div';
type BlankPosition = 'first' | 'second' | 'result';
type ProblemMode = 'normal' | 'makeTarget' | 'chain' | 'compare' | 'remainder';

interface Problem {
  a: number;
  b: number;
  op: Operation;
  result: number;
  blank: BlankPosition;
}

interface ExerciseConfig {
  gradePreset: string;
  range: { min: number; max: number };
  operations: Operation[];
  blankRatio: Record<BlankPosition, number>;
  isVertical: boolean;
  columns: 2 | 3;
  countPerPage: number;
  totalCount: number;
  showAnswerPage: boolean;
  customTitle?: string;
  studentName?: string;
  showDate?: boolean;
  problemMode: ProblemMode;
  makeTargetValue: MakeTargetValue;
  chainLength: 3 | 4;
  remainderBlank: 'quotient' | 'remainder' | 'both';
}

interface DailyStatRecord {
  visits: number;
  generations: number;
  prints: number;
  practiceProgress?: PracticeProgressRecord[];
}

interface StatisticsData {
  totalVisits: number;
  totalGenerations: number;
  totalPrints: number;
  operationsCount: Record<Operation, number>;
  gradePresetCount: Record<string, number>;
  lastVisitDate: string;
  dailyStats: Record<string, DailyStatRecord>;
}

interface WrongRecord {
  problem: AnyProblem;
  wrongAnswer: number | string;
  correctAnswer: number | string;
  timestamp: number;
  reviewCount: number;
}
```

## 题目生成约束

详细规则见 README「出题规则」和 `src/lib/generators/rules.ts`，要点：

- 加减法：所有数（含结果）都在 [min, max]；减法不出负数
- 乘除法：积 / 被除数在 [min, max]，整除；因数从 2 起（min² ≤ max 时 ≥ min）；可选表内（≤ 9）
- 连续运算：先乘除后加减；每一步中间结果和答案都是 0～max 的整数
- 比较大小：<、>、= 各约 1/3
- 有余数除法：被除数在 [min, max]，除数 2～9，余数在 1 到除数-1 之间
- 同一批次先出不重复的题，不够时重复补足并提示用户（不再悄悄少出题）
- 填空位置按配置的权重随机分配，且保证答案唯一
- 统一入口 `generateWorksheet()` 会先 `validateConfig()`；配置无效时不出题、界面显示错误
- 修改生成器时请同步更新 `generators.test.ts`

## UI 设计规范

- **面向 5 岁左右的小朋友**：字大、按钮 ≥48px、颜色柔和、少字多图标；文案短、口语、温柔鼓励（避免「生成试卷」「配置」「题型参数」这类大人用语）
- **三个主题**：`src/lib/styles/ui-themes.css` + `src/lib/config/uiThemes.ts`
  - 🍬糖果（id `a`，默认）/ 🌳森林（`b`）/ 🌊海洋（`c`）；顶部「🎨」切换，或网址 `?theme=a|b|c`，也认 `candy|forest|ocean` 与中文名；记在 localStorage `little-math-ui-theme`
  - 旧值（如 `classic`）或无效值一律回到第一个主题；`src/app.html` 的内联脚本在首屏前设置 `html[data-ui-theme]`
  - 覆盖所有页面：顶栏 `AppHeader`（导航 + 换颜色）在 `+layout.svelte`，全站通用的 `--c-*` 语义色和 `.ui-page / .ui-card / .ui-btn / .ui-input` 定义在 ui-themes.css
  - 新增样式请用 CSS 变量，三个主题都要定义（`:root` 即糖果，森林 / 海洋覆盖）
  - 不改横式数字槽 / 括号 / 竖式对齐逻辑，只改颜色、底色、圆角、间距和基准字号（整页统一字号仍由 `--fit-line-size` 决定）
  - 打印、导出 PDF 一律黑字白底（`@media print` 与导出时的 `html[data-ink=print]`），没有单独的「打印主题」
  - `E2E_UI_THEME=a|b|c pnpm test:e2e` 可在指定主题下跑整套 e2e
- **填空括号**：使用 `\u00a0`（不换行空格）保持宽度

## 打印相关

- 每个 `.page` 固定 210mm × 297mm，一页网页 = 一张 A4（屏幕、打印、PDF 一致）
- 每页最多题数定义在 `src/lib/config/layout.ts`，ExerciseSheet 按行数均分整页高度
- 使用 `@page { size: A4; margin: 0 }`，页与页之间 `break-before: page`
- 导出 PDF：`services/pdfExport.ts` 逐页 html2canvas → jsPDF 一页 A4，按需动态加载
- 打印时隐藏配置面板，只显示练习题

## 统计功能

- 使用 localStorage 存储统计数据
- 统计内容：
  - 页面访问次数
  - 练习题生成次数
  - 打印次数
  - 各运算类型使用次数
  - 各年级预设使用次数
  - 最近7天每日数据
  - 练习进度（正确率、用时）
- 埋点实现：
  - 使用 Svelte action (`use:track`) 声明式埋点
  - 页面加载时调用 `trackVisit()`
  - 生成按钮点击时自动记录
  - 打印按钮点击时自动记录
- 统计面板：
  - 右下角浮动按钮（📊）打开
  - 显示总览、运算类型分布、最近7天数据
  - 支持重置统计、导出 JSON/CSV

## 成就系统

- 基于统计数据触发成就
- 成就类型：题目数量、运算类型专精、打印次数、连续练习
- 解锁成就时显示 Toast 提示
- 成就数据存储在 localStorage

## 国际化预留

- UI 文本集中在 i18n/zh.ts
- 当前仅支持中文，保留扩展结构

## 部署

- 目标平台：Vercel
- 使用 @sveltejs/adapter-auto（Vercel 自动识别）

## 安全

### 依赖安全

- 在 pnpm-workspace.yaml 的 overrides 中强制升级有漏洞的包（pnpm 10+ 不再读取 package.json 的 "pnpm" 字段）
- 修复 CVE-2024-47764（cookie XSS 漏洞）
- 修复 GHSA-8qq5-rm4j-mr97 和 GHSA-r6q2-hw4h-h46w（tar 路径遍历漏洞）

### CVE-2024-47764 说明

**漏洞详情：**
- 影响范围：`cookie` 包版本 < 0.7.0
- 漏洞类型：XSS（跨站脚本攻击）
- 影响：cookie 名称、路径和域名的验证不严格，可能导致攻击者注入恶意代码

**修复方案（pnpm-workspace.yaml）：**
```yaml
overrides:
  cookie: ^0.7.0
  tar: ^7.5.4
```

**为什么需要 overrides：**
- `@sveltejs/kit` 2.x 系列的所有版本都依赖 `cookie ^0.6.0`
- 即使升级到最新版本的 `@sveltejs/kit`，也无法直接解决此漏洞
- 使用 overrides 可以强制覆盖依赖树中的 cookie 版本

**验证：**
```bash
pnpm why cookie  # 应显示 cookie 0.7.2
```

**参考：**
- GitHub Advisory: https://github.com/advisories/GHSA-pxg6-pf52-xh8x
- CVE Details: https://nvd.nist.gov/vuln/detail/CVE-2024-47764
