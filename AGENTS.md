# Repository Guidelines

## 项目结构
根目录是 Node.js + Express + Electron 主应用，后端源码在 `src/`，其中 `src/routes/` 按业务拆分路由，`src/agents/` 放 AI Agent，`src/utils/ai/` 放模型接入，`src/lib/` 和 `src/middleware/` 放通用基础设施。前端单独位于 `web/`，采用 Vue 3 + Vite，页面与组件分别在 `web/src/views/`、`web/src/components/`。设计与重构文档集中在 `docs/`，开始结构性改动前先看 `docs/refactoring/architecture-overview.md`。

## 构建、测试与开发命令
根目录使用 Yarn 1：

- `yarn dev`：启动后端开发服务，入口为 `src/app.ts`
- `yarn dev:gui`：以 Electron 方式启动桌面壳
- `yarn lint`：运行 TypeScript 类型检查
- `yarn build`：构建主应用到 `build/`
- `yarn dist`：打包桌面发布产物

前端命令在 `web/` 下执行：

- `cd web && yarn dev`：启动 Vite 开发服务器
- `cd web && yarn build`：执行 `vue-tsc` 并构建前端
- `cd web && yarn lint`：运行前端 ESLint

## 编码风格与命名
全仓库以 TypeScript 为主，开启 `strict`，默认使用路径别名 `@/*` 指向各自的 `src/*`。后端现有代码普遍使用双引号和 2 空格缩进；前端 Vue 代码更接近单引号风格。新增代码优先跟随所在文件，而不是强行统一整个仓库。文件命名保持语义化：路由文件用动词短语，如 `getTaskApi.ts`；Vue 组件用 PascalCase，如 `ImageUploader.vue`。

## 测试要求
当前仓库没有成型的单元测试框架，提交前至少完成与改动范围对应的静态验证与手动冒烟：后端改动跑 `yarn lint`、`yarn build`，前端改动跑 `cd web && yarn build`，并手测相关页面或接口。若补充自动化测试，推荐使用 `*.test.ts` 或 `*.spec.ts` 命名，并放在相邻模块目录。

## 提交与 PR 规范
现有提交历史以简短中文、祈使句、单一主题为主，例如 `修复小说章节管理接口`。保持一条提交只做一件事，避免把重构、功能和格式化混在一起。PR 需要写清楚变更范围、验证命令、配置或数据迁移影响；涉及 UI 时附截图，涉及接口时附请求示例或关键返回值。

## 配置与产物注意事项
不要提交密钥、令牌或本地环境配置。`build/`、`web/dist/` 属于构建产物，除非发布流程明确需要，否则不要手工编辑。涉及架构迁移时，优先保持现有行为可运行，再按 `docs/refactoring/` 中的阶段文档渐进调整。
