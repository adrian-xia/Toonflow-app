# 第 4 阶段 Agent 运行时文档实施计划

> **供代理执行：** 必须使用 `superpowers:subagent-driven-development`（若可用）或 `superpowers:executing-plans` 执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**目标：** 重写 `docs/refactoring/04-agent-runtime.md`，并新增 `docs/refactoring/04-agent-runtime-spec.md`，使第 4 阶段文档与已批准设计稿、`architecture-overview.md`、第 3 阶段服务层边界以及第 5 阶段 workflow 边界保持一致。

**架构：** 本次实施严格限定在文档层，不修改任何运行时代码、包配置或测试代码。阶段文档只定义第 4 阶段的定位、范围、边界、集成方式与验收口径；详细设计文档承接 `@toonflow/agents` 的包边界、首批 Agent 分组、`AgentContext`、统一事件协议、artifact/result 语义、多入口消费与测试基线，并明确 `services` 仍是业务 owner、`agents` 仅承接单次 agent run 协议、内容生产主链在 Phase 5 后由 `workflow` 组合驱动 `agents`。

**技术栈：** Markdown、pnpm monorepo 文档目录、`docs/refactoring/` 现有架构文档

---

## 文件结构

### 参考文件

- `docs/superpowers/specs/2026-03-28-agent-runtime-design.md`
- `docs/refactoring/architecture-overview.md`
- `docs/refactoring/03-application-services.md`
- `docs/refactoring/03-application-services-spec.md`
- `docs/refactoring/05-workflow-engine.md`

### 待创建文件

- `docs/refactoring/04-agent-runtime-spec.md`

### 待修改文件

- `docs/refactoring/04-agent-runtime.md`

### 约束

- 不修改任何 `apps/*`、`packages/*`、工作区配置或测试文件。
- 文档必须保持全中文，包名、路径名、接口名、事件名与代码标识按原样保留。
- 第 4 阶段首批范围只覆盖 `outline`、`script`、`storyboard`、`assets`、`video` 五组 Agent。
- `@toonflow/services` 仍是同名内容域的业务用例、事务与持久化 owner；`@toonflow/agents` 只负责单次 agent run 协议。
- `AgentContext` 中可注入的 `services` 能力只允许 `read/query` 性质门面，`agent run` 不得调用任何会产生领域写入的 service 用例。
- `artifact` 与 `result` 必须被定义为 run-scope 结果，不得被写成默认等同于正式领域版本或资产登记。
- `apps/api`、`apps/mcp-server` 直连 Agent 的场景只能写成隔离的 `internal/preview/debug` 入口；正式业务接口不得导入 `@toonflow/agents`。
- 不把 run 生命周期、状态机推进、暂停/恢复/重试、审核返工等 workflow 职责提前写入第 4 阶段。
- 不恢复旧入口层示例代码、WebSocket/MCP 代码片段、旧式 `ServiceRegistry` / `DbClient` 叙事作为主干内容。

### 任务 1：重写第 4 阶段阶段说明文档

**文件：**
- 修改：`docs/refactoring/04-agent-runtime.md`
- 参考：`docs/refactoring/03-application-services.md`
- 参考：`docs/superpowers/specs/2026-03-28-agent-runtime-design.md`

- [x] **步骤 1：对比当前第 4 阶段文档与第 3 阶段文档结构**

运行：

```bash
rg -n "^## " docs/refactoring/03-application-services.md docs/refactoring/04-agent-runtime.md
```

预期：

- `03-application-services.md` 已经是 11 节阶段文档结构
- `04-agent-runtime.md` 仍保留旧版“目标 / 包结构建议 / 核心设计 / 多入口示意 / 验证标准”叙事

- [x] **步骤 2：用批准后的阶段文档骨架替换现有顶层结构**

将 `docs/refactoring/04-agent-runtime.md` 重写为以下顶层结构：

```md
# Phase 4: Agent 运行时 (`@toonflow/agents`)

## 定位
## 目标
## 范围
## 非目标
## 关键决策
## Agent 运行时职责与相邻阶段边界
## 集成方式
## 首批交付基线
## 交付物
## 验收标准
## 风险与注意事项
```

- [x] **步骤 3：填充 `定位`、`目标`、`范围`、`非目标`**

必须写入以下结论：

```md
- 第 4 阶段是 `packages/agents` 的共享 Agent 运行时阶段，不是入口层 Agent 调用封装迁移
- 首批范围只覆盖 `outline / script / storyboard / assets / video`
- `@toonflow/agents` 负责单次 agent run 协议、统一事件流、artifact/result 边界与依赖注入
- `@toonflow/services` 仍负责业务用例、事务与持久化归属
- run 生命周期、状态机、暂停/恢复/重试、审核返工与阶段推进不属于本阶段
- HTTP、MCP、SSE、WebSocket 等传输层协议适配不下沉到 `@toonflow/agents`
```

- [x] **步骤 4：填充 `关键决策`、`Agent 运行时职责与相邻阶段边界`、`集成方式`**

文档必须明确锁定以下口径：

```md
- `@toonflow/agents` 可依赖 `@toonflow/services`、`@toonflow/ai-providers`、`@toonflow/storage`、`@toonflow/kernel`
- `services` 是同名内容域的业务 owner，`agents` 不是同名 service 的替代者
- `AgentContext.services` 只允许读查询门面，`agent run` 不允许通过 services 间接落库
- `apps/api` / `apps/mcp-server` 的常规业务调用面继续优先消费 `@toonflow/services`
- Phase 4 只允许隔离的 `internal/preview/debug` 入口直连 `@toonflow/agents`
- 内容生产主链在 Phase 5 后应由 `@toonflow/workflow` 组合驱动 `@toonflow/agents`
```

- [x] **步骤 5：补齐 `首批交付基线`、`交付物`、`验收标准`、`风险与注意事项`**

必须包含以下要点：

```md
- 首批交付基线是建立双层文档、统一运行时边界与五组 Agent 分组，而不是提前设计 workflow
- 交付物包含 `04-agent-runtime.md` 与 `04-agent-runtime-spec.md`
- 验收标准聚焦边界清晰、依赖方向一致、主路径与允许路径清晰、artifact/result 语义稳定
- 风险需覆盖“运行时过薄退化为脚本集合”和“运行时过胖侵入 services / workflow”两类偏差
```

- [x] **步骤 6：验证阶段文档结构与关键词**

运行：

```bash
rg -n "^## " docs/refactoring/04-agent-runtime.md
rg -n "@toonflow/agents|@toonflow/services|internal/preview/debug|workflow|outline|script|storyboard|assets|video|artifact|result" docs/refactoring/04-agent-runtime.md
```

预期：

- 11 个顶层章节全部存在且只出现一次
- `@toonflow/agents`、`@toonflow/services`、`internal/preview/debug`、五组 Agent、`artifact`、`result` 都能检索到
- `workflow` 只以阶段边界和长期主路径方式出现

- [x] **步骤 7：提交阶段文档重写**

```bash
git add docs/refactoring/04-agent-runtime.md
git commit -m "docs: 重写 phase 4 阶段说明文档"
```

### 任务 2：创建第 4 阶段详细设计文档骨架

**文件：**
- 创建：`docs/refactoring/04-agent-runtime-spec.md`
- 参考：`docs/refactoring/03-application-services-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-agent-runtime-design.md`

- [x] **步骤 1：创建详细设计文档并写入批准后的顶层结构**

在 `docs/refactoring/04-agent-runtime-spec.md` 中加入以下顶层结构：

```md
# `@toonflow/agents` 详细设计说明

## 1. 文档目的
## 2. 设计目标
## 3. 非目标
## 4. 包边界与依赖规则
## 5. 建议目录结构
## 6. 首批 Agent 分组
## 7. Agent 运行时职责模型
## 8. AgentContext 与依赖注入边界
## 9. 统一事件协议与结果边界
## 10. 多入口消费与最小接入方式
## 11. 错误模型与中断语义
## 12. 测试与验证基线
## 13. 实施范围与衔接
```

- [x] **步骤 2：先写第 `1` 到 `5` 节共享规则**

这些章节必须覆盖：

```md
- 文档与 `04-agent-runtime.md` 的关系
- 第 4 阶段设计目标与非目标
- `@toonflow/agents` 允许依赖 `kernel/services/ai-providers/storage`
- 禁止依赖 `apps/*`、`workflow`、数据库客户端、repository、入口层私有协议
- 建议目录结构只定义包内层次与运行时分层，不展开方法表、SDK 回调或入口适配代码
```

- [x] **步骤 3：验证详细设计骨架存在且顺序正确**

运行：

```bash
rg -n "^## " docs/refactoring/04-agent-runtime-spec.md
sed -n '1,220p' docs/refactoring/04-agent-runtime-spec.md
```

预期：

- 13 个章节全部存在
- 包边界、目录结构等共享规则章节位于 Agent 分组、上下文和事件协议章节之前

- [x] **步骤 4：提交详细设计骨架**

```bash
git add docs/refactoring/04-agent-runtime-spec.md
git commit -m "docs: 搭建 phase 4 详细设计骨架"
```

### 任务 3：补全首批 Agent 分组与运行时职责模型

**文件：**
- 修改：`docs/refactoring/04-agent-runtime-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-agent-runtime-design.md`
- 参考：`docs/refactoring/03-application-services-spec.md`

- [x] **步骤 1：填写 `首批 Agent 分组` 章节**

该章节必须把以下五组写成运行时职责边界，而不是方法列表：

```md
- `outline agent`
- `script agent`
- `storyboard agent`
- `assets agent`
- `video agent`
```

每组至少说明：

```md
- 该组负责哪类 agent run 封装
- 是否会组合 `services + ai-providers + storage + kernel`
- 为什么不替代同名 service 的业务 owner 身份
- 哪些职责应留给 `workflow` 或入口层消费者
```

- [x] **步骤 2：填写 `Agent 运行时职责模型`**

必须明确：

```md
- `业务用例（use case）`、`agent run`、`workflow run` 三个术语的区别
- `agents` 负责单次运行协议、统一事件、artifact/result/error 边界
- `agents` 不负责领域写入、版本创建、资产登记、run 生命周期
- `artifact` 与 `result` 默认只代表本次运行结果，不自动等同于正式领域数据
```

- [x] **步骤 3：填写 `AgentContext 与依赖注入边界`**

必须明确：

```md
- 数据访问经 `services` 暴露的只读查询门面完成
- `agent run` 禁止调用会写库、提交副作用、创建版本、登记资产的 service 用例
- 模型调用可直连 `@toonflow/ai-providers`
- run-scope 产物写入可直连 `@toonflow/storage`
- 不允许隐式全局单例、导入即初始化、入口层私有上下文对象
```

- [x] **步骤 4：验证首批分组与职责口径**

运行：

```bash
rg -n "outline agent|script agent|storyboard agent|assets agent|video agent" docs/refactoring/04-agent-runtime-spec.md
rg -n "use case|agent run|workflow run|read/query|artifact|result|资产登记|领域写入" docs/refactoring/04-agent-runtime-spec.md
```

预期：

- 五组 Agent 全部出现
- `use case`、`agent run`、`workflow run`、`read/query`、`artifact`、`result`、`资产登记`、`领域写入` 等关键词都能明确检索到

- [x] **步骤 5：提交 Agent 分组与职责章节**

```bash
git add docs/refactoring/04-agent-runtime-spec.md
git commit -m "docs: 补全 phase 4 agent 分组与职责边界"
```

### 任务 4：补全统一事件协议、多入口消费与验证基线

**文件：**
- 修改：`docs/refactoring/04-agent-runtime-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-agent-runtime-design.md`
- 参考：`docs/refactoring/05-workflow-engine.md`

- [x] **步骤 1：填写 `统一事件协议与结果边界`**

必须写清：

```md
- `@toonflow/agents` 对外只提供 `run()` 与 `stream()`
- `run()` 与 `stream()` 共享同一输入边界和主要错误语义，只在输出方式上区分
- 统一事件协议至少覆盖 `progress`、`artifact`、`result`、`error`
- `artifact` 是 run-scope 产物，可携带存储引用，但默认不等于领域资产记录
- `result` 是最终结构化结果，不隐含持久化已完成
- 如需把 artifact/result 沉淀为正式领域数据，必须由外层 `services` 或 `workflow + services` 显式完成
- 入口层不得依赖某个 Agent 私有事件名或某个 SDK 的原始回调形态
```

- [x] **步骤 2：填写 `多入口消费与最小接入方式`**

该章节必须包含以下明确口径：

```md
- `apps/api` 常规业务接口继续以 `@toonflow/services` 为主调用面
- 只有隔离的 `internal/preview/debug` 入口允许直连 `@toonflow/agents`
- 正式业务接口、常规 route/controller、对外稳定 API 不得导入 `@toonflow/agents`
- `apps/mcp-server` 只允许在隔离的 tool-style 入口中直连 Agent
- 任何直连 Agent 的入口都禁止落库、登记资产、创建正式版本或推进项目状态
- Phase 5 后内容生产主链由 `workflow` 作为上层编排入口
```

- [x] **步骤 3：填写 `错误模型与中断语义`、`测试与验证基线`、`实施范围与衔接`**

必须写清：

```md
- 错误语义优先复用 `@toonflow/kernel`
- 对外暴露统一错误语义和中断语义，不透传底层 provider / storage 原始异常原文
- `@toonflow/agents` 可脱离入口层独立验证
- AI 生成型 Agent 默认以 stub/mock provider 为验证基线
- 验证重点覆盖依赖注入正确、事件协议稳定、artifact/result 边界清晰、入口消费隔离明确
- 本轮实施范围仅限重写 `04-agent-runtime.md` 与新增 `04-agent-runtime-spec.md`
- Phase 5 继续承接 workflow 状态机、重试、暂停恢复、审核返工与主链编排
```

- [x] **步骤 4：验证事件、入口和测试口径**

运行：

```bash
rg -n "run\\(\\)|stream\\(\\)|共享同一输入边界|错误语义|progress|artifact|result|error|私有事件名|原始回调|internal/preview/debug|route/controller|落库|登记资产|创建正式版本|正式版本|推进项目状态|stub|mock|@toonflow/kernel|Phase 5" docs/refactoring/04-agent-runtime-spec.md
```

预期：

- `run()`、`stream()`、共享输入/错误边界、四类稳定事件、禁止私有事件/原始回调、`internal/preview/debug`、直连入口禁止项、`stub/mock`、`@toonflow/kernel`、`Phase 5` 都能检索到
- 没有把正式业务接口写成默认直连 Agent

- [x] **步骤 5：提交事件协议与验证章节**

```bash
git add docs/refactoring/04-agent-runtime-spec.md
git commit -m "docs: 完成 phase 4 详细设计约束"
```

### 任务 5：做跨文档一致性校验与收尾

**文件：**
- 修改：`docs/refactoring/04-agent-runtime.md`
- 修改：`docs/refactoring/04-agent-runtime-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-agent-runtime-design.md`

- [ ] **步骤 1：全文检查是否残留旧叙事、旧接口片段与占位内容**

运行：

```bash
rg -n "WebSocket|AsyncGenerator|toolCall|ServiceRegistry|DbClient|Logger|未来 CLI|workflowRuntime.appendEvent|TODO|TBD" docs/refactoring/04-agent-runtime.md docs/refactoring/04-agent-runtime-spec.md
```

预期：

- 不再保留旧版入口代码示例与低层接口片段叙事
- 不存在 `TODO` 或 `TBD`
- 不再把第 4 阶段写回“入口层协议翻译代码示例”风格

- [ ] **步骤 2：核对两份文档与设计稿口径一致**

运行：

```bash
rg -n "@toonflow/agents|@toonflow/services|internal/preview/debug|outline|script|storyboard|assets|video|agent run|workflow run|artifact|result|read/query" docs/refactoring/04-agent-runtime.md docs/refactoring/04-agent-runtime-spec.md
```

预期：

- 两份文档都体现 `@toonflow/agents`、`@toonflow/services` 与 `internal/preview/debug` 的边界
- 五组 Agent、`agent run` / `workflow run`、`artifact` / `result`、`read/query` 门面都完整出现
- 没有把正式业务主路径写成直连 Agent

- [ ] **步骤 3：执行文档级格式检查**

运行：

```bash
git diff --check
```

预期：

- 无尾随空格、冲突标记或补丁格式错误

- [ ] **步骤 4：人工通读关键段落**

通读以下文件并确认三点：

```bash
sed -n '1,260p' docs/refactoring/04-agent-runtime.md
sed -n '1,360p' docs/refactoring/04-agent-runtime-spec.md
```

检查要点：

- 阶段文档不下沉到接口级实现或入口代码示例
- 详细设计文档不漂移回业务 owner 或 workflow 设计
- `services` / `agents` / `workflow` 的边界、`artifact/result` 语义、入口隔离规则表述一致

- [ ] **步骤 5：如仍有未提交改动，提交最终收尾**

```bash
git add docs/refactoring/04-agent-runtime.md docs/refactoring/04-agent-runtime-spec.md
git commit -m "docs: 完成 phase 4 agent 运行时文档重构"
```

预期：

- 如果前面任务已全部提交且当前无新改动，可跳过这一步
- 如果一致性校验阶段做了修订，本步骤生成最终收尾提交
