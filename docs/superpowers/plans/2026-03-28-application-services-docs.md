# 第 3 阶段应用服务层文档实施计划

> **供代理执行：** 必须使用 `superpowers:subagent-driven-development`（若可用）或 `superpowers:executing-plans` 执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**目标：** 重写 `docs/refactoring/03-application-services.md`，并新增 `docs/refactoring/03-application-services-spec.md`，使第 3 阶段文档与已批准设计稿、`architecture-overview.md` 以及第 2 阶段双层文档模式保持一致。

**架构：** 本次实施严格限定在文档层，不修改任何运行时代码、包配置或测试代码。阶段文档只定义第 3 阶段的定位、范围、边界与验收口径；详细设计文档承接 `@toonflow/services` 的包级约束、首批服务分组、DTO / 事务 / 错误 / 装配 / 测试基线，并明确 `apps/api` 仅在启动期承担 composition root 装配职责，业务调用面只消费 `@toonflow/services`。

**技术栈：** Markdown、pnpm monorepo 文档目录、`docs/refactoring/` 现有架构文档

---

## 文件结构

### 参考文件

- `docs/superpowers/specs/2026-03-28-application-services-design.md`
- `docs/refactoring/architecture-overview.md`
- `docs/refactoring/02-ai-providers-storage.md`
- `docs/refactoring/02-ai-providers-storage-spec.md`

### 待创建文件

- `docs/refactoring/03-application-services-spec.md`

### 待修改文件

- `docs/refactoring/03-application-services.md`

### 约束

- 不修改任何 `apps/*`、`packages/*`、工作区配置或测试文件。
- 不恢复旧单体路由统计、逐方法服务表、迁移前后代码对比作为主干叙事。
- 第 3 阶段首批范围只覆盖 `project`、`novel`、`outline`、`script`、`storyboard`、`assets`、`video` 七组核心内容域。
- `prompt`、`setting`、`auth` 不进入首批文档范围。
- 文档必须保持全中文，包名、路径名与代码标识按原样保留。

### 任务 1：重写第 3 阶段阶段说明文档骨架

**文件：**
- 修改：`docs/refactoring/03-application-services.md`
- 参考：`docs/refactoring/02-ai-providers-storage.md`
- 参考：`docs/superpowers/specs/2026-03-28-application-services-design.md`

- [ ] **步骤 1：对比当前第 3 阶段文档与第 2 阶段文档结构**

运行：

```bash
rg -n "^## " docs/refactoring/02-ai-providers-storage.md docs/refactoring/03-application-services.md
```

预期：

- `02-ai-providers-storage.md` 显示完整阶段文档结构
- `03-application-services.md` 仍以旧版提纲、服务清单和迁移叙事为主

- [ ] **步骤 2：用批准后的阶段文档骨架替换现有顶层结构**

将 `docs/refactoring/03-application-services.md` 重写为以下顶层结构：

```md
# Phase 3: 应用服务层提取 (`@toonflow/services`)

## 定位
## 目标
## 范围
## 非目标
## 关键决策
## 服务层职责与相邻阶段边界
## 集成方式
## 首批交付基线
## 交付物
## 验收标准
## 风险与注意事项
```

- [ ] **步骤 3：填充 `定位`、`目标`、`范围`、`非目标`**

必须写入以下结论：

```md
- 第 3 阶段是 `packages/services` 的应用服务层阶段，不是旧单体路由瘦身清单
- 首批范围只覆盖 `project / novel / outline / script / storyboard / assets / video`
- 服务层负责领域用例、事务协调与单次业务用例内的 `repository + ai-providers + storage` 组合编排
- `prompt / setting / auth` 不在首批范围
- 传输层职责、Agent 运行时、长流程工作流不属于本阶段
```

- [ ] **步骤 4：填充 `关键决策`、`服务层职责与相邻阶段边界`、`集成方式`**

文档必须明确锁定以下口径：

```md
- `@toonflow/services` 是共享应用服务层，不是 repository 的薄封装
- 最小装配链是 `db + ai-providers + storage -> services -> apps/api`
- `apps/api` 可以在应用启动期作为 composition root 完成依赖装配
- route/controller 等业务调用面只消费 `@toonflow/services`
- `services` 负责单次业务用例编排，不提前承接 `agents` / `workflow` 的长流程职责
```

- [ ] **步骤 5：补齐 `首批交付基线`、`交付物`、`验收标准`、`风险与注意事项`**

必须包含以下要点：

```md
- 首批交付基线是建立第 3 阶段文档边界与最小接入方式，而不是全量旧路由等价迁移
- 交付物包含 `03-application-services.md` 与 `03-application-services-spec.md`
- 验收标准聚焦边界清晰、范围收敛、依赖方向一致、最小接入口径明确
- 风险需覆盖“服务层过薄”和“服务层过胖”两类偏差
```

- [ ] **步骤 6：验证阶段文档结构与关键词**

运行：

```bash
rg -n "^## " docs/refactoring/03-application-services.md
rg -n "@toonflow/services|apps/api|composition root|project|storyboard|workflow|auth" docs/refactoring/03-application-services.md
```

预期：

- 11 个顶层章节全部存在且只出现一次
- `@toonflow/services`、`apps/api`、`composition root`、七组核心内容域都能被检索到
- `auth` 仅以非目标或排除范围出现

- [ ] **步骤 7：提交阶段文档重写**

```bash
git add docs/refactoring/03-application-services.md
git commit -m "docs: 重写 phase 3 阶段说明文档"
```

### 任务 2：创建第 3 阶段详细设计文档骨架

**文件：**
- 创建：`docs/refactoring/03-application-services-spec.md`
- 参考：`docs/refactoring/02-ai-providers-storage-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-application-services-design.md`

- [ ] **步骤 1：创建详细设计文档并写入批准后的顶层结构**

在 `docs/refactoring/03-application-services-spec.md` 中加入以下顶层结构：

```md
# `@toonflow/services` 详细设计说明

## 1. 文档目的
## 2. 设计目标
## 3. 非目标
## 4. 包边界与依赖规则
## 5. 建议目录结构
## 6. 首批领域服务分组
## 7. 应用服务职责模型
## 8. 输入输出与 DTO 边界
## 9. 事务与副作用协调原则
## 10. 错误模型与返回约束
## 11. 装配与最小接入方式
## 12. 测试与验证基线
## 13. 实施范围与衔接
```

- [ ] **步骤 2：先写第 `1` 到 `5` 节共享规则**

这些章节必须覆盖：

```md
- 文档与 `03-application-services.md` 的关系
- 设计目标与非目标
- `@toonflow/services` 允许依赖 `kernel/db/ai-providers/storage`
- 禁止依赖 `apps/*`、`agents`、`workflow`
- 建议目录结构只定义包内分层，不定义方法表
```

- [ ] **步骤 3：验证详细设计骨架存在且顺序正确**

运行：

```bash
rg -n "^## " docs/refactoring/03-application-services-spec.md
sed -n '1,220p' docs/refactoring/03-application-services-spec.md
```

预期：

- 13 个章节全部存在
- 共享规则章节位于服务分组与应用服务职责章节之前

- [ ] **步骤 4：提交详细设计骨架**

```bash
git add docs/refactoring/03-application-services-spec.md
git commit -m "docs: 搭建 phase 3 详细设计骨架"
```

### 任务 3：补全首批服务分组与应用服务职责

**文件：**
- 修改：`docs/refactoring/03-application-services-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-application-services-design.md`

- [ ] **步骤 1：填写 `首批领域服务分组` 章节**

该章节必须把以下七组写成职责边界，而不是方法列表：

```md
- `project`
- `novel`
- `outline`
- `script`
- `storyboard`
- `assets`
- `video`
```

每组至少说明：

```md
- 该组负责哪类业务用例
- 是否会组合 `repository + ai-providers + storage`
- 哪些职责不属于本组
```

- [ ] **步骤 2：填写 `应用服务职责模型`**

必须明确：

```md
- `services` 负责领域用例执行、事务协调、单次业务用例内编排
- `services` 不负责 HTTP 参数解析、JWT、SSE/WebSocket、日志中间件
- `apps/api` 负责参数校验、错误映射、响应封装与传输层适配
- `services` 不提前承接 Agent 运行时与长流程工作流
```

- [ ] **步骤 3：验证首批分组与职责口径**

运行：

```bash
rg -n "project|novel|outline|script|storyboard|assets|video" docs/refactoring/03-application-services-spec.md
rg -n "事务|编排|JWT|SSE|workflow|agents" docs/refactoring/03-application-services-spec.md
```

预期：

- 七组核心内容域全部出现
- 应用服务职责与排除项都能明确检索到

- [ ] **步骤 4：提交服务分组与职责章节**

```bash
git add docs/refactoring/03-application-services-spec.md
git commit -m "docs: 补全 phase 3 服务分组与职责边界"
```

### 任务 4：补全 DTO、事务、错误与接入口径

**文件：**
- 修改：`docs/refactoring/03-application-services-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-application-services-design.md`
- 参考：`docs/refactoring/architecture-overview.md`

- [ ] **步骤 1：填写 `输入输出与 DTO 边界`**

必须写清：

```md
- 应用服务只暴露稳定输入输出对象
- 不直接暴露 HTTP request/response、数据库行结构、Knex 查询结果、厂商 SDK 原始响应
- storage 内部路径或底层实现对象不直接泄漏给入口层
```

- [ ] **步骤 2：填写 `事务与副作用协调原则` 与 `错误模型与返回约束`**

必须写清：

```md
- 单次业务用例内由 service 协调多个 repository 写入和 AI / storage 副作用顺序
- 第 3 阶段不引入跨多阶段、可恢复、可重试的长流程状态机
- 优先复用 `@toonflow/kernel` 的错误语义
- 不直接向上抛数据库驱动异常、provider SDK 异常、文件系统原始异常
```

- [ ] **步骤 3：填写 `装配与最小接入方式`**

该章节必须包含以下明确口径：

```md
- `apps/api` 可在应用启动期作为 composition root 初始化 repository、AI registry、storage adapter
- route/controller 等业务调用面只消费 `@toonflow/services`
- 第 3 阶段只要求最小可验证接入链路，不要求铺满全部 API 接入面
```

- [ ] **步骤 4：填写 `测试与验证基线` 与 `实施范围与衔接`**

必须包含：

```md
- `@toonflow/services` 可脱离 HTTP 层独立验证
- AI 生成型服务默认以 stub/mock provider 为基线
- 测试重点覆盖依赖注入正确、事务边界明确、错误归一化稳定
- 本轮实施范围仅限重写 `03-application-services.md` 与新增 `03-application-services-spec.md`
- 第 4 / 5 阶段继续承接 Agent 与 Workflow 能力
```

- [ ] **步骤 5：验证 DTO、错误和装配口径**

运行：

```bash
rg -n "DTO|request/response|Knex|SDK|composition root|@toonflow/kernel|stub|mock" docs/refactoring/03-application-services-spec.md
```

预期：

- DTO 边界、错误归一化、composition root、stub/mock 基线都能被检索到
- 没有把 `apps/api` 写成运行期直接拼接底层包的业务调用层

- [ ] **步骤 6：提交 DTO、事务、错误与接入章节**

```bash
git add docs/refactoring/03-application-services-spec.md
git commit -m "docs: 完成 phase 3 详细设计约束"
```

### 任务 5：做跨文档一致性校验与收尾

**文件：**
- 修改：`docs/refactoring/03-application-services.md`
- 修改：`docs/refactoring/03-application-services-spec.md`
- 参考：`docs/superpowers/specs/2026-03-28-application-services-design.md`

- [ ] **步骤 1：全文检查是否残留旧叙事与占位内容**

运行：

```bash
rg -n "82 个路由|src/routes|ProjectService|AuthService|TBD|TODO" docs/refactoring/03-application-services.md docs/refactoring/03-application-services-spec.md
```

预期：

- 不再出现旧版“82 个路由”统计
- 不再出现旧单体 `src/routes` 迁移叙事
- 不再保留 `ProjectService`、`AuthService` 这类旧式方法清单驱动叙事
- 不存在 `TBD` 或 `TODO`

- [ ] **步骤 2：核对两份文档与设计稿口径一致**

运行：

```bash
rg -n "@toonflow/services|apps/api|composition root|project|novel|outline|script|storyboard|assets|video|prompt|setting|auth" docs/refactoring/03-application-services.md docs/refactoring/03-application-services-spec.md
```

预期：

- 两份文档都体现 `@toonflow/services` 与 `apps/api` 的边界
- 七组核心内容域都完整出现
- `prompt`、`setting`、`auth` 只出现在排除范围或非目标中

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
sed -n '1,240p' docs/refactoring/03-application-services.md
sed -n '1,320p' docs/refactoring/03-application-services-spec.md
```

检查要点：

- 阶段文档不下沉到方法级实现
- 详细设计文档不漂移回传输层或长流程设计
- `apps/api` 的启动期装配职责与业务调用面边界表述一致

- [ ] **步骤 5：如仍有未提交改动，提交最终收尾**

```bash
git add docs/refactoring/03-application-services.md docs/refactoring/03-application-services-spec.md
git commit -m "docs: 完成 phase 3 应用服务层文档重构"
```

预期：

- 如果前面任务已全部提交且当前无新改动，可跳过这一步
- 如果一致性校验阶段做了修订，本步骤生成最终收尾提交
