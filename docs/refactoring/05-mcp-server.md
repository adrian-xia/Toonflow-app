# Phase 5: MCP Server

## 目标

暴露稳定的 MCP 工具层给 OpenClaw Agent 调用，stdio 传输优先。

---

## 5.1 MCP Server 骨架

### 包结构

```
apps/mcp-server/
├── src/
│   ├── index.ts              # 入口（stdio 传输）
│   ├── server.ts             # McpServer 实例化 + tool 注册
│   ├── toolkits/
│   │   ├── project.ts        # 项目管理工具组
│   │   ├── novel.ts          # 小说管理工具组
│   │   ├── planning.ts       # 大纲+剧本生成工具组
│   │   ├── production.ts     # 分镜+素材+视频工具组
│   │   ├── workflow.ts       # 工作流控制工具组
│   │   ├── review.ts         # 审核工具组
│   │   └── config.ts         # AI 配置工具组
│   └── resources/
│       └── project.ts        # MCP resource 暴露
├── package.json
└── tsconfig.json
```

---

## 5.2 MCP Tools 定义

### Project 工具组

| 工具名 | 说明 |
|---|---|
| `toonflow_project_create` | 创建项目 |
| `toonflow_project_get` | 获取项目详情 |
| `toonflow_project_list` | 列出所有项目 |
| `toonflow_project_update` | 更新项目 |
| `toonflow_project_delete` | 删除项目 |

### Novel 工具组

| 工具名 | 说明 |
|---|---|
| `toonflow_novel_import` | 导入小说 |
| `toonflow_novel_list` | 列出小说章节 |
| `toonflow_novel_get` | 获取章节内容 |

### Planning 工具组

| 工具名 | 说明 |
|---|---|
| `toonflow_outline_generate` | 生成大纲（触发 Agent） |
| `toonflow_outline_get` | 获取大纲 |
| `toonflow_outline_list` | 列出所有大纲 |
| `toonflow_outline_update` | 更新大纲 |
| `toonflow_script_generate` | 生成剧本 |
| `toonflow_script_get` | 获取剧本 |

### Production 工具组

| 工具名 | 说明 |
|---|---|
| `toonflow_storyboard_generate` | 生成分镜 |
| `toonflow_storyboard_get` | 获取分镜 |
| `toonflow_storyboard_list` | 列出分镜 |
| `toonflow_assets_generate` | 生成素材 |
| `toonflow_assets_list` | 列出素材 |
| `toonflow_video_generate` | 生成视频 |
| `toonflow_video_status` | 查询视频状态 |

### Workflow 工具组

| 工具名 | 说明 |
|---|---|
| `toonflow_workflow_start` | 启动工作流 |
| `toonflow_workflow_status` | 查询工作流状态 |
| `toonflow_workflow_retry` | 重试失败步骤 |
| `toonflow_workflow_pause` | 暂停工作流 |
| `toonflow_workflow_resume` | 恢复工作流 |

### Review 工具组

| 工具名 | 说明 |
|---|---|
| `toonflow_review_inbox` | 获取待审核列表 |
| `toonflow_review_get_report` | 获取审核报告 |
| `toonflow_review_approve` | 通过审核 |
| `toonflow_review_rework` | 返工 |
| `toonflow_review_reject` | 驳回 |

### Config 工具组

| 工具名 | 说明 |
|---|---|
| `toonflow_config_list_models` | 列出 AI 模型 |
| `toonflow_config_add_model` | 添加模型 |
| `toonflow_config_update_model` | 更新模型 |

---

## 5.3 MCP Resources

| URI 模式 | 说明 |
|---|---|
| `toonflow://project/{id}` | 项目详情 + 关联数据 |
| `toonflow://project/{id}/outline` | 大纲数据 |
| `toonflow://project/{id}/script/{scriptId}` | 剧本内容 |
| `toonflow://project/{id}/storyboard/{id}` | 分镜数据 |

---

## 5.4 架构决策

MCP Server 直接 import `@toonflow/services`，不走 HTTP，减少网络开销。

```typescript
// apps/mcp-server/src/server.ts
import { ProjectService, OutlineService, ScriptService } from "@toonflow/services";

const server = new McpServer({ name: "toonflow", version: "1.0.0" });

// 注册工具
server.tool("toonflow_project_list", {}, async () => {
  const projects = await projectService.list();
  return { content: [{ type: "text", text: JSON.stringify(projects) }] };
});
```

---

## 5.5 依赖

- `@modelcontextprotocol/sdk`
- `@toonflow/services`
- `@toonflow/kernel`

---

## 5.6 验证标准

- MCP Inspector 可连接并测试所有 tool
- stdio 传输正常工作
- 所有 tool 返回正确数据
