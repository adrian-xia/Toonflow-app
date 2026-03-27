# Phase 2: AI Provider 与存储层提取 (`@toonflow/ai-providers` + `@toonflow/storage`)

## 定位

Phase 2 是 `@toonflow/db` 之后的基础设施阶段，目标是把 AI 能力与文件存储能力提取为可复用包边界，而不是做 API 工具层重构。本文件只定义阶段边界与验收口径，包级约束见详细设计文档。

## 目标

- 将 `@toonflow/ai-providers` 与 `@toonflow/storage` 明确为独立 workspace package。
- 锁定可执行的最小基线：`text + image + local storage`。
- 在保持依赖方向稳定的前提下，为后续 `@toonflow/services` 提供可注入的基础设施能力。
- 将 `video` 与 `S3-compatible storage` 保留为已定义的扩展点，不把它们提升为首批必须实现项。

## 范围

Phase 2 只覆盖两个基础设施包的阶段定义，不覆盖业务编排层。范围包括：

- `@toonflow/ai-providers` 的文本、图像、视频三类统一抽象及注册边界。
- `@toonflow/storage` 的文件读写、路径约束、URL 生成与适配器边界。
- 首批可运行能力以 `text + image + local storage` 为最低交付基线。
- `video` 与 `S3-compatible storage` 在本阶段仅保留扩展位与文档约束。

## 非目标

Phase 2 明确不做以下事项：

- 不做 provider 配置持久化（例如数据库管理模型配置）。
- 不做 provider 路由策略（例如业务场景默认模型与 fallback 策略）。
- 不做对象存储真实实现交付（`S3-compatible storage` 不属于首批必须落地）。
- 不恢复 `utils.ts`、全局单例或导入即初始化的兼容层模式。

## 关键决策

- 两个包都必须通过显式构造与 `dependency injection` 被上层消费，禁止回流为全局工具对象。
- `@toonflow/ai-providers` 接收结构化配置对象，不负责配置持久化。
- `TextProvider` 在 Phase 2 就必须同时支持 `invoke()` 与 `stream()` 两种调用语义。
- `@toonflow/storage` 必须优先提供真实可运行的 `local storage` 实现。
- `S3-compatible storage` 在 Phase 2 保持扩展点，不作为首批必交实现。
- provider 与 storage 的错误语义应尽可能复用 `@toonflow/kernel`，避免各包平行造错码体系。

## 集成方式

上层以显式构造的方式装配依赖，并通过依赖注入传入服务层或入口层组合器：

```ts
import { createAiProviderRegistry } from "@toonflow/ai-providers";
import { createLocalStorage } from "@toonflow/storage";

const aiRegistry = createAiProviderRegistry({
  text: [/* structured config */],
  image: [/* structured config */],
  video: []
});

const storage = createLocalStorage({
  rootDir: "/data/toonflow",
  publicBaseUrl: "http://127.0.0.1:3001/files"
});
```

约束：

- 包内不直接依赖 `process.env` 进行业务配置决策。
- 配置解析可在边缘层完成，再以结构化对象注入到两个包。
- 入口层只负责装配，不把 provider 与 storage 重新包装为全局单例。

## 交付物

- 阶段说明文档：[`02-ai-providers-storage.md`](./02-ai-providers-storage.md)
- 详细设计文档：[`02-ai-providers-storage-spec.md`](./02-ai-providers-storage-spec.md)
- 两个文档统一对齐 `architecture-overview.md` 与 Phase 1 的阶段文档层级。

## 验收标准

- 本文档包含完整阶段结构：`定位` / `目标` / `范围` / `非目标` / `关键决策` / `集成方式` / `交付物` / `验收标准` / `风险与注意事项`。
- 术语与包名统一使用 `@toonflow/ai-providers` 与 `@toonflow/storage`。
- 基线描述明确：`text + image + local storage` 为首批可执行能力。
- 扩展点描述明确：`video` 与 `S3-compatible storage` 不进入首批必须实现。
- 调用语义明确：`TextProvider.invoke()` 与 `TextProvider.stream()` 都是 Phase 2 的正式要求。
- 职责边界明确：配置持久化、provider 路由策略、对象存储实现不属于本阶段。

## 风险与注意事项

- 如果未坚持显式依赖注入，后续容易再次出现入口层全局工具回流。
- 如果 `stream()` 语义定义不清晰，上层实现可能被某个厂商 SDK 事件模型绑定。
- 如果 `local storage` 路径约束未在详细设计中固定，多入口场景下会出现目录与 URL 规则漂移。
- 如果错误语义不复用 `@toonflow/kernel`，后续 `services` 层将承担额外错误归一化成本。
