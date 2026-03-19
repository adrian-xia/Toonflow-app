# Phase 4: Agent 运行时提取 (`@toonflow/agents`)

## 目标

把 Agent 运行时从入口层中抽离，形成可被 API、MCP、工作流和未来 CLI 复用的统一能力包。

本阶段直接建设新的 Agent 接口，不保留旧传输协议适配层作为长期方案。

---

## 包结构建议

```text
packages/agents/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── outline/
│   │   └── index.ts
│   ├── storyboard/
│   │   └── index.ts
│   └── runtime/
│       ├── context.ts
│       └── events.ts
├── package.json
└── tsconfig.json
```

---

## 核心设计

### 1. 依赖显式注入

Agent 通过 context 接收依赖：

```ts
interface AgentContext {
  services: ServiceRegistry;
  ai: AIRegistry;
  storage: StorageAdapter;
  logger?: Logger;
}
```

数据访问通过 services 暴露的领域接口完成，Agent 不直接依赖 repository 或 `DbClient`。

不允许内部直接读取全局单例。

### 2. 统一事件协议

```ts
interface AgentEvent {
  type: "stream" | "toolCall" | "progress" | "artifact" | "result" | "error";
  data: unknown;
}
```

Agent 对外暴露的主接口应是：

- `run()`：一次性命令执行
- `stream()`：基于 `AsyncGenerator<AgentEvent>` 的流式输出

### 3. 入口层只做协议翻译

- `apps/api` 把 `AgentEvent` 翻译成 WebSocket / SSE
- `apps/mcp-server` 把结果转换成 MCP tool response
- `packages/workflow` 负责调度与阶段管理

---

## 多入口消费示意

### WebSocket

```ts
for await (const event of outlineAgent.stream(input)) {
  ws.send(JSON.stringify(event));
}
```

### MCP

```ts
const result = await outlineAgent.run(input);
return { content: [{ type: "text", text: result.summary }] };
```

### Workflow

```ts
for await (const event of storyboardAgent.stream(input)) {
  workflowRuntime.appendEvent(runId, event);
}
```

---

## 依赖关系

| 依赖包 | 用途 |
|--------|------|
| `@toonflow/kernel` | 共享类型、错误、schema |
| `@toonflow/ai-providers` | 模型调用 |
| `@toonflow/storage` | 文件与素材 |
| `@toonflow/services` | 领域服务 |

---

## 验证标准

- Agent 包可独立通过 `build`、`lint`、`typecheck`
- API、MCP、Workflow 三个入口都能消费同一套 Agent 实现
- 关键 Agent 具备直接测试覆盖
- 入口层不需要知道 Agent 内部如何组织模型调用
