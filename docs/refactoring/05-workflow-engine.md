# Phase 5: 工作流引擎 (`@toonflow/workflow`)

## 目标

从"页面驱动操作"升级为"工作流驱动平台"，页面和 Agent 都通过工作流驱动。

---

## 5.1 状态机定义

### 完整状态流转

```
novel_imported → outline_generating → outline_generated →
script_generating → script_generated →
storyboard_generating → storyboard_created →
assets_generating → assets_generated →
video_generating → video_produced →
review_pending → review_approved / review_rework →
publish_ready → published
```

### 合法状态转换表

| 当前状态 | 可转换到 | 说明 |
|----------|----------|------|
| `novel_imported` | `outline_generating` | 开始生成大纲 |
| `outline_generating` | `outline_generated` | 大纲生成成功 |
| `outline_generating` | `review_rework` | 生成失败，回退 |
| `outline_generated` | `script_generating` | 开始生成剧本 |
| `script_generating` | `script_generated` | 剧本生成成功 |
| `script_generated` | `storyboard_generating` | 开始生成分镜 |
| `storyboard_generating` | `storyboard_created` | 分镜生成成功 |
| `storyboard_created` | `assets_generating` | 开始生成素材 |
| `assets_generating` | `assets_generated` | 素材生成成功 |
| `assets_generated` | `video_generating` | 开始生成视频 |
| `video_generating` | `video_produced` | 视频生成成功 |
| `video_produced` | `review_pending` | 进入审核队列 |
| `review_pending` | `review_approved` | 审核通过 |
| `review_pending` | `review_rework` | 审核要求返工 |
| `review_pending` | `review_rejected` | 审核拒绝 |
| `review_rework` | *(指定阶段)* | 回退到指定阶段重新执行 |
| `review_approved` | `publish_ready` | 准备发布 |
| `publish_ready` | `published` | 发布完成 |

---

## 5.2 数据模型

### t_workflow_run

记录一次完整的工作流执行实例，与项目一一对应。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| projectId | integer | 关联项目 |
| currentStage | varchar | 当前阶段 |
| status | varchar | `running` / `paused` / `completed` / `failed` |
| config | jsonb | 工作流配置（如跳过某些阶段） |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |

### t_workflow_step

记录工作流中每个阶段的执行详情。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| runId | integer | 关联 workflow_run |
| stage | varchar | 阶段名 |
| status | varchar | `pending` / `running` / `completed` / `failed` / `skipped` |
| input | jsonb | 步骤输入 |
| output | jsonb | 步骤输出 |
| startedAt | timestamp | 开始时间 |
| completedAt | timestamp | 完成时间 |
| error | text | 错误信息 |

### t_review_task

记录人工审核任务及其决定。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| runId | integer | 关联 workflow_run |
| stage | varchar | 审核阶段 |
| status | varchar | `pending` / `approved` / `rework` / `rejected` |
| decision | varchar | 审核决定 |
| reason | text | 审核理由 |
| operator | varchar | 操作人 |
| createdAt | timestamp | 创建时间 |

---

## 5.3 WorkflowEngine 核心接口

```typescript
class WorkflowEngine {
  // 启动一个新的工作流实例
  async start(projectId: number, config?: WorkflowConfig): Promise<WorkflowRun>

  // 推进工作流到下一阶段
  async advance(runId: number): Promise<WorkflowStep>

  // 重试失败的步骤（不指定 stepId 则重试当前步骤）
  async retry(runId: number, stepId?: number): Promise<void>

  // 暂停工作流
  async pause(runId: number): Promise<void>

  // 恢复已暂停的工作流
  async resume(runId: number): Promise<void>

  // 获取工作流当前状态
  async getStatus(runId: number): Promise<WorkflowRun>

  // 获取所有步骤执行记录
  async getSteps(runId: number): Promise<WorkflowStep[]>
}
```

### WorkflowConfig 类型

```typescript
interface WorkflowConfig {
  // 跳过指定阶段（如已有素材可跳过 assets_generating）
  skipStages?: string[]

  // 需要人工审核的阶段（默认：video_produced）
  reviewStages?: string[]

  // 各阶段超时时间（毫秒）
  timeouts?: Partial<Record<WorkflowStage, number>>
}
```

---

## 5.4 页面集成

### Creator Console

- "生成大纲"、"生成剧本"等操作 → 调用 `WorkflowEngine.advance()` 创建对应 workflow step
- 页面通过 WebSocket 订阅 workflow 进度，实时展示各阶段状态
- 支持手动暂停/恢复工作流

### Review Console

- 审核操作（通过/返工/拒绝）→ 更新 `t_review_task` + 调用 `WorkflowEngine.advance()` 推进流程
- 返工时指定回退目标阶段，工作流从该阶段重新执行

### WebSocket 推送事件

```typescript
// 工作流进度事件
interface WorkflowProgressEvent {
  type: 'workflow:progress'
  runId: number
  stage: string
  status: 'running' | 'completed' | 'failed'
  step?: WorkflowStep
}

// 审核任务事件
interface ReviewTaskEvent {
  type: 'workflow:review'
  runId: number
  reviewTask: ReviewTask
}
```

---

## 5.5 包结构

```
packages/workflow/
├── src/
│   ├── index.ts              # 公共导出
│   ├── engine.ts             # WorkflowEngine 核心实现
│   ├── state-machine.ts      # 状态转换定义与校验
│   ├── steps/                # 各阶段执行器
│   │   ├── outline.ts        # 大纲生成步骤
│   │   ├── script.ts         # 剧本生成步骤
│   │   ├── storyboard.ts     # 分镜生成步骤
│   │   ├── assets.ts         # 素材生成步骤
│   │   ├── video.ts          # 视频生成步骤
│   │   └── review.ts         # 审核步骤
│   └── types.ts              # 类型定义
├── package.json
└── tsconfig.json
```

---

## 5.6 依赖关系

```
@toonflow/workflow
├── @toonflow/kernel     # 基础工具与配置
├── @toonflow/db         # 数据库访问层
├── @toonflow/services   # 业务服务层
└── @toonflow/agents     # AI Agent 执行层
```

---

## 5.7 验证标准

- 工作流可从 `novel_imported` 完整推进到 `published`
- 暂停/恢复/重试功能正常工作
- 审核流程（通过/返工/拒绝）可正常流转
- 返工时可回退到指定阶段并重新执行
- WebSocket 实时推送工作流进度到前端页面
- 非法状态转换被拒绝并返回明确错误信息
