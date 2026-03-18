# Phase 7: Agent 运行时提取 (@toonflow/agents)

## 目标

将 Agent 与传输层解耦，使页面 WebSocket、MCP、HTTP API 三个入口能够复用同一套 Agent 实现，消除当前 Agent 与 WebSocket 的强绑定关系。

---

## 当前状态

### OutlineScript Agent (`src/agents/outlineScript/index.ts`)

- 约 737 行代码
- 使用 `EventEmitter` 发送事件：`data`、`response`、`subAgentStream`、`toolCall`、`transfer`、`refresh`
- 直接通过 `u.db()` 访问数据库
- 多 Agent 协作：AI1（故事师）、AI2（大纲师）、director（导演）
- 使用 Vercel AI SDK tool calling
- 通过 WebSocket 路由 `agentsOutline.ts` 消费

### Storyboard Agent (`src/agents/storyboard/index.ts`)

- 结构类似：`segmentAgent` + `shotAgent`
- 包含图像生成管线（`generateImageTool`、`imageSplitting`）
- 同样使用 `EventEmitter` + WebSocket

### 现存问题

| 问题 | 影响 |
|------|------|
| Agent 与 WebSocket 传输层紧耦合 | 无法在 MCP / HTTP 场景复用 |
| 直接依赖全局 `u.db()` 和 `u.ai.*` | 难以测试、难以替换实现 |
| `EventEmitter` 模式 | 不适合 MCP / HTTP 消费，无法 `await` 完成 |

---

## 7.1 重构 Agent 接口

### 核心类型定义

```typescript
// packages/agents/src/types.ts

interface AgentEvent {
  type: 'stream' | 'toolCall' | 'transfer' | 'refresh' | 'response' | 'error';
  data: unknown;
}

interface AgentContext {
  projectId: number;
  db: DbClient;
  ai: AIProviders;
  storage: IStorage;
}
```

### OutlineScript Agent 重构

将 `EventEmitter.emit()` 替换为 `AsyncGenerator` yield，使调用方可以用标准 `for await...of` 消费事件流。

```typescript
// packages/agents/src/outlineScript/index.ts

class OutlineScriptAgent {
  constructor(private context: AgentContext) {}

  async *run(msg: string, history: ModelMessage[]): AsyncGenerator<AgentEvent> {
    // 替代 EventEmitter.emit("data", ...)
    yield { type: 'stream', data: { text: '...' } };

    // 替代 EventEmitter.emit("toolCall", ...)
    yield { type: 'toolCall', data: { agent: 'main', name: '...', args: null } };

    // 替代 EventEmitter.emit("transfer", ...)
    yield { type: 'transfer', data: { to: 'AI1' } };

    // 替代 EventEmitter.emit("refresh", ...)
    yield { type: 'refresh', data: 'outline' };

    // 最终响应
    yield { type: 'response', data: fullResponse };
  }
}
```

---

## 7.2 关键改动

### 依赖注入替代全局 `u` 对象

```typescript
// 旧：直接引用全局工具对象
import u from "@/utils";
// Agent 内部直接用 u.db("t_outline")...

// 新：通过构造函数注入依赖
class OutlineScriptAgent {
  constructor(private ctx: AgentContext) {}
  // 内部用 this.ctx.db("t_outline")...
  // 或更好：注入专用 Repository 对象
}
```

### EventEmitter → AsyncGenerator

```typescript
// 旧：
this.emitter.emit("data", text);
this.emitter.emit("toolCall", { agent, name, args });

// 新：
yield { type: 'stream', data: { text } };
yield { type: 'toolCall', data: { agent, name, args } };
```

### Vercel AI SDK tool calling 保持不变

`tool()` 定义和 `invoke` / `stream` 调用模式保持不变，只改事件传递方式，降低重构风险。

---

## 7.3 多入口消费

### 入口一：页面 WebSocket

```typescript
// apps/api/src/routes/outline/agentsOutline.ts

ws.on('message', async (msg) => {
  const agent = new OutlineScriptAgent(context);
  for await (const event of agent.run(msg, history)) {
    switch (event.type) {
      case 'stream':
        ws.send(JSON.stringify({ type: 'data', ...event.data }));
        break;
      case 'toolCall':
        ws.send(JSON.stringify({ type: 'toolCall', ...event.data }));
        break;
      case 'transfer':
        ws.send(JSON.stringify({ type: 'transfer', ...event.data }));
        break;
      case 'refresh':
        ws.send(JSON.stringify({ type: 'refresh', data: event.data }));
        break;
      case 'response':
        ws.send(JSON.stringify({ type: 'response', data: event.data }));
        break;
    }
  }
});
```

### 入口二：MCP Server

```typescript
// apps/mcp-server/src/toolkits/planning.ts

server.tool("toonflow_outline_generate", schema, async (params) => {
  const agent = new OutlineScriptAgent(context);
  let result = '';
  for await (const event of agent.run(params.message, [])) {
    if (event.type === 'response') result = event.data as string;
  }
  return { content: [{ type: "text", text: result }] };
});
```

### 入口三：HTTP API（SSE）

```typescript
// apps/api/src/api/v1/outlines.ts

router.post('/generate', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const agent = new OutlineScriptAgent(context);
  for await (const event of agent.run(req.body.message, [])) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  res.end();
});
```

---

## 7.4 包结构

```
packages/agents/
├── src/
│   ├── index.ts                        # 统一导出
│   ├── types.ts                        # AgentEvent, AgentContext
│   ├── outlineScript/
│   │   └── index.ts                    # OutlineScriptAgent
│   └── storyboard/
│       ├── index.ts                    # StoryboardAgent
│       ├── generateImageTool.ts
│       ├── generateImagePromptsTool.ts
│       └── imageSplitting.ts
├── package.json
└── tsconfig.json
```

---

## 7.5 兼容层（过渡期）

过渡期内同时支持 `EventEmitter` 和 `AsyncGenerator` 双模式，避免一次性大规模改动导致回归。

```typescript
// 适配器：将 AsyncGenerator 转为 EventEmitter，供旧消费方使用
function agentToEmitter(
  agent: AsyncGenerator<AgentEvent>
): EventEmitter {
  const emitter = new EventEmitter();
  (async () => {
    for await (const event of agent) {
      emitter.emit(event.type, event.data);
    }
  })();
  return emitter;
}
```

旧的 WebSocket 路由可先通过此适配器过渡，待三个入口全部切换完成后移除适配器。

---

## 依赖关系

| 依赖包 | 用途 |
|--------|------|
| `@toonflow/kernel` | 基础类型与工具 |
| `@toonflow/db` | 数据库客户端（`DbClient`） |
| `@toonflow/ai-providers` | AI 提供商抽象（`AIProviders`） |
| `@toonflow/services` | 业务服务层 |
| `ai` | Vercel AI SDK（tool calling） |

---

## 验证标准

- [ ] WebSocket 入口调用 Agent，功能与重构前一致
- [ ] MCP 入口调用 Agent，返回正确结果
- [ ] HTTP SSE 入口调用 Agent，事件流正常推送
- [ ] 三个入口在相同输入下产出结果一致
- [ ] 兼容层适配器通过现有 WebSocket 集成测试
