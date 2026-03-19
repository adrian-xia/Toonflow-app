# Phase 9: Review Console (apps/review-console)

## 目标

人工验证与接管工作台，围绕 workflow run 聚合全链路上下文，为审核人员提供统一的产物预览、质量报告和动作执行入口。

---

## 9.1 骨架

### 技术栈

- Vue 3 + Vite（与 Creator Console 一致）
- 调用 `apps/api` 的 v1 API
- 共享 `@toonflow/kernel` 类型

### 包结构

```
apps/review-console/
├── src/
│   ├── api/
│   │   ├── client.ts         # API client
│   │   └── websocket.ts      # WebSocket 管理
│   ├── components/
│   │   ├── ReviewInbox.vue
│   │   ├── RunDetail.vue
│   │   ├── QAReport.vue
│   │   ├── ArtifactPreview.vue
│   │   ├── AuditTimeline.vue
│   │   └── ActionPanel.vue
│   ├── views/
│   │   ├── Inbox.vue          # 验证收件箱
│   │   ├── RunDetail.vue      # 运行详情
│   │   ├── QAReport.vue       # QA 报告
│   │   └── Exceptions.vue     # 异常接管
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   └── review.ts          # Pinia store
│   └── App.vue
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 9.2 核心页面

### A. 验证收件箱 `/review/inbox`

展示所有待人工验证的 workflow run。

**列表字段：**

| 列 | 说明 |
|----|------|
| 项目名 | 关联项目名称 |
| runId | 工作流运行 ID |
| 当前阶段 | outline_generated / script_generated / ... |
| 自动审核结论 | pass / warning / fail |
| 风险等级 | low / medium / high |
| 推荐动作 | approve / review / rework |

**筛选条件：**

- 阶段（outline / script / storyboard / video）
- 风险等级（low / medium / high）
- 是否多次返工

---

### B. 运行详情 `/review/runs/:runId`

三栏布局：

- 左栏：流程摘要（workflow 各步骤状态）
- 中栏：产物预览（大纲文本 / 剧本内容 / 分镜图片 / 视频片段）
- 右栏：人工动作面板

**Tab 页：**

| Tab | 内容 |
|-----|------|
| Overview | 工作流概览 + 关键指标 |
| Artifacts | 各阶段产物浏览 |
| QA Report | 质量报告 |
| Version Compare | 版本对比（返工前后） |
| Audit Timeline | 操作审计时间线 |

**动作按钮：**

| 动作 | 说明 |
|------|------|
| approve | 通过 |
| partial_rework | 局部返工 |
| full_rework | 整体返工 |
| pause | 暂停 |
| reject | 驳回 |
| force_publish | 强制发布 |

---

### C. QA 报告 `/review/reports/:runId`

**评分维度：**

- 技术质量分（图像分辨率、视频帧率、音频质量）
- 一致性分（角色外观一致性、场景连贯性）
- 语义审片分（剧情逻辑、对话自然度）

**问题列表：**

- 每个问题关联到具体镜头
- 点击可跳转到对应分镜预览
- 支持"标记人工确认通过"

---

### D. 异常接管 `/review/exceptions`

展示工作流执行中的异常：

- 错误信息
- 重试次数
- 供应商状态（AI 服务是否可用）

**动作：**

| 动作 | 说明 |
|------|------|
| Resume | 恢复执行 |
| Force retry | 强制重试 |
| Switch provider | 切换 AI 供应商 |
| Cancel | 取消工作流 |

---

## 9.3 后端 API 支撑

| API | 方法 | 说明 |
|-----|------|------|
| `/api/v1/reviews/inbox` | GET | 获取待审核列表 |
| `/api/v1/reviews/runs/:runId` | GET | 获取运行详情 |
| `/api/v1/reviews/runs/:runId/report` | GET | 获取 QA 报告 |
| `/api/v1/reviews/runs/:runId/approve` | POST | 通过审核 |
| `/api/v1/reviews/runs/:runId/rework` | POST | 返工 |
| `/api/v1/reviews/runs/:runId/reject` | POST | 驳回 |
| `/api/v1/reviews/exceptions` | GET | 获取异常列表 |
| `/api/v1/reviews/exceptions/:id/retry` | POST | 重试异常 |
| `/api/v1/reviews/exceptions/:id/switch-provider` | POST | 切换供应商 |

---

## 9.4 统一动作模型

页面、MCP、API 三入口发送同一格式，workflow engine 统一消费：

```json
{
  "runId": "run_001",
  "action": "partial_rework",
  "reason": "第 6 镜头角色一致性偏低",
  "operator": "adrian",
  "payload": {
    "targetShots": ["s6"],
    "priority": "high"
  }
}
```

---

## 9.5 依赖

- `@toonflow/kernel`（共享类型）
- `vue` 3、`vue-router`、`pinia`、`vite`

---

## 9.6 验证标准

- 收件箱正确展示待审核项
- 运行详情页三栏布局正常
- 审核动作（通过 / 返工 / 驳回）正确推进工作流
- 异常接管页面可执行恢复 / 重试 / 切换操作
- WebSocket 实时更新审核状态
