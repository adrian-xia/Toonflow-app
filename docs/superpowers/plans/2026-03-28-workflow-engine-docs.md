# 第 5 阶段工作流引擎文档实施计划

> **供代理执行：** 必须使用 `superpowers:subagent-driven-development`（若可用）或 `superpowers:executing-plans` 执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**目标：** 重写 `docs/refactoring/05-workflow-engine.md`，并新增 `docs/refactoring/05-workflow-engine-spec.md`，使第 5 阶段文档与已批准设计稿、`architecture-overview.md`、第 3/4 阶段边界以及第 6 阶段 API Gateway 入口职责保持一致。

**架构：** 本次实施严格限定在文档层，不修改任何运行时代码、包配置或测试代码。阶段文档只定义第 5 阶段的定位、范围、边界、集成方式与验收口径；详细设计文档承接 `@toonflow/workflow` 的包边界、阶段模型、数据模型、命令接口、执行编排、审核返工、事件模型、幂等约束、目录结构与测试基线，并明确 `workflow` 负责内容生产主链的长流程编排，`services` 仍是正式持久化 owner，`agents` 仍只负责单次 agent run 协议。

**技术栈：** Markdown、pnpm monorepo 文档目录、`docs/refactoring/` 现有架构文档

---

## 文件结构

### 参考文件

- `docs/superpowers/specs/2026-03-28-workflow-engine-design.md`
- `docs/refactoring/architecture-overview.md`
- `docs/refactoring/03-application-services.md`
- `docs/refactoring/03-application-services-spec.md`
- `docs/refactoring/04-agent-runtime.md`
- `docs/refactoring/04-agent-runtime-spec.md`
- `docs/refactoring/06-api-gateway.md`

### 待创建文件

- `docs/refactoring/05-workflow-engine-spec.md`

### 待修改文件

- `docs/refactoring/05-workflow-engine.md`

### 约束

- 不修改任何 `apps/*`、`packages/*`、工作区配置或测试文件。
- 文档必须保持全中文，包名、路径名、阶段名、接口名、事件名与代码标识按原样保留。
- 第 5 阶段必须收敛为 Toonflow 当前内容生产主链的专用工作流引擎，不写成通用工作流平台。
- 阶段模型只保留 `outline`、`script`、`storyboard`、`assets`、`video`、`review` 六个稳定业务检查点。
- `novel_imported` 只能写成工作流启动前置条件，不得继续作为 Phase 5 正式 workflow stage。
- `publish_ready / published` 不得继续保留在 Phase 5 主链状态机中。
- 人工审核属于 `@toonflow/workflow` 的核心语义；审核等待、审核决定、返工回退规则必须归入 workflow，而不是回流到 `services` 或入口层。
- 单项目同一时刻只允许一个活跃的内容生产主链 run，文档必须明确该约束。
- `@toonflow/workflow` 负责组合 `agents + services`，先产出 run-scope 结果，再由 workflow 驱动 service 显式沉淀正式领域数据或资产记录。
- 第 5 阶段只定义支持异步后台执行的编排语义，不绑定具体队列、worker 或调度基础设施。
- 不得保留 `advance(runId)` 作为页面或控制台手工推进主链的核心接口。
- workflow 只发布稳定 workflow 事件，不直接透传 agent 内部细粒度流式事件。
- 不恢复旧版“完整状态流转表 + 表结构草图 + engine 伪代码 + 页面按钮驱动”的单页写法作为主干结构。

### 任务 1：重写第 5 阶段阶段说明文档

**文件：**
- 修改：`docs/refactoring/05-workflow-engine.md`
- 参考：`docs/refactoring/04-agent-runtime.md`
- 参考：`docs/superpowers/specs/2026-03-28-workflow-engine-design.md`

- [x] **步骤 1：对比当前第 5 阶段文档与第 4 阶段文档结构**

运行：

```bash
rg -n "^## " docs/refactoring/04-agent-runtime.md docs/refactoring/05-workflow-engine.md
```

预期：

- `04-agent-runtime.md` 已经是 11 节阶段文档结构
- `05-workflow-engine.md` 仍保留旧版“状态机定义 / 数据模型 / 接口 / 页面集成 / 包结构 / 验证标准”叙事

- [x] **步骤 2：用批准后的阶段文档骨架替换现有顶层结构**

将 `docs/refactoring/05-workflow-engine.md` 重写为以下顶层结构：

```md
# Phase 5: 工作流引擎 (`@toonflow/workflow`)

## 定位
## 目标
## 范围
## 非目标
## 关键决策
## Workflow 职责与相邻阶段边界
## 集成方式
## 首批交付基线
## 交付物
## 验收标准
## 风险与注意事项
```

- [x] **步骤 3：填充 `定位`、`目标`、`范围`、`非目标`**

必须写入以下结论：

```md
- 第 5 阶段是 `packages/workflow` 的工作流引擎阶段，不是页面操作编排清单
- 第 5 阶段聚焦 Toonflow 当前内容生产主链，而不是通用工作流框架
- 首批范围只覆盖 `outline / script / storyboard / assets / video / review`
- `@toonflow/workflow` 负责 `workflow run` 生命周期、阶段推进、审核返工、暂停恢复、失败重试与稳定事件
- 具体任务队列、worker 技术、发布流程与传输层协议不属于本阶段
```

- [x] **步骤 4：填充 `关键决策`、`Workflow 职责与相邻阶段边界`、`集成方式`**

文档必须明确锁定以下口径：

```md
- `workflow` 组合 `agents + services`：先触发单次 `agent run`，再调用 service 显式沉淀正式领域数据
- `services` 仍是业务用例、事务与正式持久化 owner
- `agents` 仍只负责单次 agent run 协议、统一事件和 run-scope artifact/result
- 人工审核由 `workflow` 拥有，`review-console` 只消费任务并提交决定
- 单项目同一时刻只允许一个活跃主链 run
- `apps/api` / `apps/mcp-server` 只做命令、查询与事件转发，不重写状态机规则
- 第 5 阶段只定义异步后台编排语义，不绑定具体任务系统
```

- [x] **步骤 5：补齐 `首批交付基线`、`交付物`、`验收标准`、`风险与注意事项`**

必须包含以下要点：

```md
- 首批交付基线是建立 Phase 5 双层文档、主链边界、审核返工归属与异步编排语义
- 交付物包含 `05-workflow-engine.md` 与 `05-workflow-engine-spec.md`
- 验收标准聚焦边界清晰、主链阶段模型稳定、审核返工归属明确、单项目单活跃 run 约束明确、与 Phase 3/4 衔接一致
- 风险需覆盖“workflow 过薄退化为状态记录器”和“workflow 过胖吞并 services / apps 职责”两类偏差
```

- [x] **步骤 6：验证阶段文档结构与关键词**

运行：

```bash
rg -n "^## " docs/refactoring/05-workflow-engine.md
rg -n "@toonflow/workflow|@toonflow/services|@toonflow/agents|review-console|outline|script|storyboard|assets|video|review|异步|审核|返工|单项目" docs/refactoring/05-workflow-engine.md
```

预期：

- 11 个顶层章节全部存在且只出现一次
- `@toonflow/workflow`、`@toonflow/services`、`@toonflow/agents`、六个业务检查点、审核/返工/异步/单项目约束都能检索到
- `publish_ready`、`published`、`advance(runId)` 不再作为主干语义保留

- [x] **步骤 7：提交阶段文档重写**

```bash
git add docs/refactoring/05-workflow-engine.md
git commit -m "docs: 重写 phase 5 阶段说明文档"
```

### 任务 2：创建第 5 阶段详细设计文档骨架

**文件：**
- 创建：`docs/refactoring/05-workflow-engine-spec.md`
- 参考：`docs/refactoring/04-agent-runtime-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-workflow-engine-design.md`

- [x] **步骤 1：创建详细设计文档并写入批准后的顶层结构**

在 `docs/refactoring/05-workflow-engine-spec.md` 中加入以下顶层结构：

```md
# `@toonflow/workflow` 详细设计说明

## 1. 文档目的
## 2. 设计目标
## 3. 非目标
## 4. 包边界与依赖规则
## 5. 阶段模型与状态语义
## 6. 数据模型
## 7. 对外命令与查询接口
## 8. 执行编排模型
## 9. 审核与返工规则
## 10. 事件模型与投递边界
## 11. 失败、重试与幂等约束
## 12. 建议目录结构
## 13. 测试与验证基线
## 14. 实施范围与衔接
```

- [x] **步骤 2：先写第 `1` 到 `4` 节共享规则**

这些章节必须覆盖：

```md
- 文档与 `05-workflow-engine.md` 的关系
- 第 5 阶段设计目标与非目标
- `@toonflow/workflow` 允许依赖 `kernel/db/services/agents`
- 禁止依赖 `apps/*`、`ai-providers`、`storage`、入口层私有协议
```

- [x] **步骤 3：验证详细设计骨架存在且顺序正确**

运行：

```bash
rg -n "^## " docs/refactoring/05-workflow-engine-spec.md
sed -n '1,240p' docs/refactoring/05-workflow-engine-spec.md
```

预期：

- 14 个章节全部存在
- 共享规则章节位于阶段模型、数据模型、命令接口章节之前

- [x] **步骤 4：提交详细设计骨架**

```bash
git add docs/refactoring/05-workflow-engine-spec.md
git commit -m "docs: 搭建 phase 5 详细设计骨架"
```

### 任务 3：补全阶段模型、数据模型与命令接口

**文件：**
- 修改：`docs/refactoring/05-workflow-engine-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-workflow-engine-design.md`
- 参考：`docs/refactoring/04-agent-runtime-spec.md`

- [x] **步骤 1：填写 `阶段模型与状态语义`**

该章节必须明确：

```md
- 业务检查点阶段只包含 `outline`、`script`、`storyboard`、`assets`、`video`、`review`
- `novel_imported` 是启动前置条件，不是正式 workflow stage
- `publish_ready / published` 不属于 Phase 5 主链状态机
- 运行生命周期状态与业务阶段分层表达
- `step attempt` 状态单独表达 `pending / running / succeeded / failed / skipped`
```

- [x] **步骤 2：填写 `数据模型`**

该章节必须至少写清以下模型职责：

```md
- `workflow_run`
- `workflow_step`
- `workflow_step_attempt`
- `workflow_review_task`
```

每个模型至少说明：

```md
- 它表达哪类事实
- 它与其他模型的关系
- 为什么需要它而不是把信息覆盖写回上一层记录
```

- [x] **步骤 3：填写 `对外命令与查询接口`**

必须明确：

```md
- 启动 run
- 暂停 run
- 恢复 run
- 重试当前失败阶段或指定失败 attempt
- 提交审核决定
- 查询 run 状态与阶段时间线
- 不暴露 `advance(runId)` 作为页面或控制台手工推进主链的核心命令
```

- [x] **步骤 4：验证阶段模型、数据模型与命令接口口径**

运行：

```bash
rg -n "outline|script|storyboard|assets|video|review|novel_imported|publish_ready|published" docs/refactoring/05-workflow-engine-spec.md
rg -n "workflow_run|workflow_step|workflow_step_attempt|workflow_review_task|advance\\(runId\\)|暂停|恢复|重试|审核" docs/refactoring/05-workflow-engine-spec.md
```

预期：

- 六个业务检查点全部出现，`novel_imported` 只以启动前置条件出现
- `publish_ready / published` 只以排除项或非目标出现
- `workflow_run / step / attempt / review_task` 都能检索到
- `advance(runId)` 只以明确排除方式出现

- [x] **步骤 5：提交阶段模型、数据模型与接口章节**

```bash
git add docs/refactoring/05-workflow-engine-spec.md
git commit -m "docs: 补全 phase 5 状态模型与命令接口"
```

### 任务 4：补全执行编排、审核返工、事件与幂等约束

**文件：**
- 修改：`docs/refactoring/05-workflow-engine-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-workflow-engine-design.md`
- 参考：`docs/refactoring/03-application-services-spec.md`
- 参考：`docs/refactoring/04-agent-runtime-spec.md`

- [x] **步骤 1：填写 `执行编排模型`**

该章节必须明确以下组件与职责：

```md
- `WorkflowRunService`
- `WorkflowStateMachine`
- `StepOrchestrator`
- `WorkflowRepository`
- `WorkflowEventPublisher`
- `SchedulerPort` 或等价调度唤醒端口
```

至少说明：

```md
- 哪个组件接收外部命令
- 哪个组件定义状态迁移
- 哪个组件组合 `agents + services`
- 哪个组件负责 workflow 自身持久化
- 哪个组件负责对外事件发布
- 第 5 阶段只定义调度语义，不绑定具体队列/worker 技术
```

- [x] **步骤 2：填写 `审核与返工规则`**

必须明确：

```md
- 审核等待是 workflow 自身状态，不是入口层补丁逻辑
- `review-console` 只消费任务并提交决定
- 返工只允许回退到稳定业务检查点
- `rework` 是业务路径，不是系统失败
- `rejected` 是业务终态，不是技术异常
```

- [x] **步骤 3：填写 `事件模型与投递边界`、`失败、重试与幂等约束`**

必须明确：

```md
- workflow 只发布稳定业务事件，不直接透传 agent 内部细粒度事件
- 阶段执行失败、审核业务结果、人工控制状态必须分开表达
- 每次重试都创建新的 `workflow_step_attempt`
- service 沉淀动作必须具备幂等保护，以适配至少一次调度语义
- 暂停表示不再继续调度下一阶段，而不是强制取消不可中断底层任务
```

- [x] **步骤 4：填写 `建议目录结构`、`测试与验证基线`、`实施范围与衔接`**

必须写入以下方向：

```md
- 建议目录结构至少包含 `application/`、`state-machine/`、`orchestration/`、`repositories/`、`events/`
- 测试基线覆盖状态机单测、返工规则单测、仓储测试、编排测试、审核流转测试、事件契约测试
- 本轮实施范围固定为重写 `05-workflow-engine.md` 与新增 `05-workflow-engine-spec.md`
```

- [x] **步骤 5：验证详细设计文档关键口径**

运行：

```bash
rg -n "WorkflowRunService|WorkflowStateMachine|StepOrchestrator|WorkflowRepository|WorkflowEventPublisher|SchedulerPort" docs/refactoring/05-workflow-engine-spec.md
rg -n "review-console|rework|rejected|幂等|至少一次|暂停|恢复|事件|state-machine|orchestration|repositories|events" docs/refactoring/05-workflow-engine-spec.md
```

预期：

- 关键组件全部出现且职责可区分
- 审核返工、幂等、暂停恢复、稳定事件、目录结构与测试基线都能明确检索到

- [x] **步骤 6：提交执行编排与约束章节**

```bash
git add docs/refactoring/05-workflow-engine-spec.md
git commit -m "docs: 补全 phase 5 编排与审核约束"
```

### 任务 5：收尾校验与最终提交

**文件：**
- 修改：`docs/refactoring/05-workflow-engine.md`
- 创建：`docs/refactoring/05-workflow-engine-spec.md`

- [x] **步骤 1：全文检查是否仍残留旧版误导性语义**

运行：

```bash
rg -n "advance\\(runId\\)|novel_imported →|publish_ready|published|页面通过 WebSocket 订阅 workflow 进度，实时展示各阶段状态|WorkflowEngine 核心接口|t_workflow_run|t_workflow_step|t_review_task" docs/refactoring/05-workflow-engine.md docs/refactoring/05-workflow-engine-spec.md
```

预期：

- 旧版整段状态链、旧接口清单、旧表名草图、页面按钮驱动语句不再作为主干内容存在
- 若这些词仍出现，也只能出现在“非目标 / 排除项 / 设计取舍说明”上下文

- [x] **步骤 2：检查文档标题、章节结构与交付物引用**

运行：

```bash
rg -n "^# |^## " docs/refactoring/05-workflow-engine.md docs/refactoring/05-workflow-engine-spec.md
rg -n "05-workflow-engine.md|05-workflow-engine-spec.md|architecture-overview|03-application-services|04-agent-runtime|06-api-gateway" docs/refactoring/05-workflow-engine.md docs/refactoring/05-workflow-engine-spec.md
```

预期：

- 阶段说明文档与详细设计文档标题、章节结构完整
- 相邻阶段与架构概览的引用都存在

- [x] **步骤 3：查看最终 diff，确认本轮只涉及 Phase 5 文档**

运行：

```bash
git diff -- docs/refactoring/05-workflow-engine.md docs/refactoring/05-workflow-engine-spec.md
git status --short
```

预期：

- diff 只包含两个目标文档
- 工作区没有意外改动

- [x] **步骤 4：提交最终文档结果**

```bash
git add docs/refactoring/05-workflow-engine.md docs/refactoring/05-workflow-engine-spec.md
git commit -m "docs: 完成 phase 5 workflow 文档重构"
```
