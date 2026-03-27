# Toonflow Phase 2 AI Providers and Storage Design

## 概述

本文档定义 Toonflow Phase 2 的设计目标：将 AI 调用能力与文件存储能力从入口层和未来服务层中抽离，形成两个独立、可复用、可测试的基础设施包：

- `@toonflow/ai-providers`
- `@toonflow/storage`

本设计直接对齐以下文档：

- 架构总览：[`docs/refactoring/architecture-overview.md`](../../refactoring/architecture-overview.md)
- Phase 0 基线：[`docs/refactoring/00-monorepo-skeleton.md`](../../refactoring/00-monorepo-skeleton.md)
- Phase 1 阶段说明：[`docs/refactoring/01-database-layer.md`](../../refactoring/01-database-layer.md)
- Phase 1 详细设计：[`docs/refactoring/01-database-layer-spec.md`](../../refactoring/01-database-layer-spec.md)

本文档服务于后续 implementation plan，不承担旧单体迁移说明的职责，也不为旧的全局工具对象保留兼容层。

## 核心决策

- Phase 2 采用与 Phase 1 一致的双层文档结构：保留阶段说明文档，并新增独立详细设计文档。
- `@toonflow/ai-providers` 和 `@toonflow/storage` 都是共享基础设施包，不是 `apps/api` 的私有工具目录。
- 两个包都只能通过显式构造和依赖注入被上层消费，禁止回流成 `utils.ts`、全局单例或导入即初始化的兼容层。
- `@toonflow/ai-providers` 只负责统一调用抽象、厂商适配、模型注册和返回语义，不负责配置持久化，也不负责业务场景下的模型选择策略。
- `@toonflow/storage` 只负责文件存取、路径约束、URL 生成和内容读取抽象，不负责业务目录规划、资源生命周期编排或权限判断。
- AI 能力在 Phase 2 锁定统一的 `text / image / video` 三类接口，其中 `text + image` 为首批必须可运行的实现基线，`video` 只锁接口和注册位。
- `text` 在 Phase 2 即固定支持 `invoke()` 与 `stream()` 两种调用语义。
- 存储能力在 Phase 2 锁定 `local storage` 为唯一必须落地的实现，S3-compatible storage 仅作为扩展点写入详细设计。
- 错误语义优先复用 `@toonflow/kernel`，不在 provider 或 storage 包内自建一套平行错误体系。

## 目标与非目标

### 目标

- 在 monorepo 中定义清晰的 Phase 2 文档分层，避免阶段范围与包级约束混写。
- 为 `@toonflow/ai-providers` 和 `@toonflow/storage` 建立稳定的包边界、目录结构和公共 API。
- 固定最小可落地基线，使后续 implementation plan 不停留在抽象层。
- 定义显式配置输入和运行时装配方式，保证未来 `@toonflow/services` 能稳定消费这两个包。
- 定义统一错误语义、测试基线和验收口径，避免实现阶段临时发散。

### 非目标

- 不在 Phase 2 设计模型配置的数据库持久化或管理后台。
- 不在 Phase 2 定义业务场景如何选择默认模型、备用模型或供应商路由策略。
- 不把视频生成的真实厂商接入纳入首批必须交付范围。
- 不把 S3-compatible storage 的真实实现纳入首批必须交付范围。
- 不将 `apps/api` 直接塑造成长期的 provider / storage 组合层。
- 不恢复旧单体中的全局 `u.*` 工具对象、兼容目录或转发层。

## 文档交付物设计

Phase 2 的 refactoring 文档应拆成两个层级：

- `docs/refactoring/02-ai-providers-storage.md`
  - 负责 Phase 2 的定位、目标、范围、非目标、关键决策、交付物、验收标准和风险。
- `docs/refactoring/02-ai-providers-storage-spec.md`
  - 负责包边界、依赖规则、目录结构、公共 API、配置模型、注册机制、运行约束和测试基线。

拆分原则如下：

- 阶段说明文档回答“本阶段要交付什么、为什么这样界定”。
- 详细设计文档回答“两个 package 的边界、接口和实现约束如何落地”。
- 详细设计文档先写共享规则，再分别展开 `@toonflow/ai-providers` 与 `@toonflow/storage`。
- 文档不把两个 package 混写为一个大而全的基础设施层，避免后续计划阶段难以拆解工作项。

## 依赖方向与架构边界

Phase 2 必须继续遵守 [`architecture-overview.md`](../../refactoring/architecture-overview.md) 的依赖方向：

```text
kernel
  ├── db
  ├── ai-providers
  └── storage

db + ai-providers + storage + kernel
  └── services
```

边界约束如下：

- `@toonflow/ai-providers` 可以依赖：
  - 厂商 SDK
  - `@toonflow/kernel` 中真正跨包共享的类型、错误码和纯函数
- `@toonflow/storage` 可以依赖：
  - Node.js 文件系统能力
  - `@toonflow/kernel` 中真正跨包共享的类型、错误码和纯函数
- 两个包都不允许依赖：
  - `apps/*`
  - `@toonflow/services`
  - `@toonflow/agents`
  - `@toonflow/workflow`
- `@toonflow/ai-providers` 与 `@toonflow/storage` 在 Phase 2 中保持并列关系，不互相依赖。

长期目标是由 `@toonflow/services` 聚合 `db + ai-providers + storage`。如果 Phase 2 为了最小链路验证需要由脚本或临时组合层直接创建实例，文档中必须明确这是阶段性验证，不是未来包依赖模式。

## `@toonflow/ai-providers` 设计

### 包职责

`@toonflow/ai-providers` 只负责：

- 文本模型调用抽象
- 图像模型调用抽象
- 视频模型调用接口占位
- 厂商差异适配
- provider 注册与解析
- 请求、响应、流式输出和错误语义的统一

它不负责：

- 模型配置持久化
- 项目级默认模型选择
- 工作流编排
- 文件存储
- HTTP / MCP / Electron / Web UI 适配

### 首批能力基线

Phase 2 固定如下基线：

- `text`
  - 必须提供至少一个可运行实现
  - 必须支持 `invoke()` 和 `stream()`
- `image`
  - 必须提供至少一个可运行实现
  - 必须支持统一的 `generate()` 能力
- `video`
  - 必须定义接口、类型和 registry 扩展位
  - 不要求首批具备真实厂商实现

这样定义的目标是让后续 `services`、`agents` 和 API 层可以尽早围绕统一抽象组织调用，同时避免在 Phase 2 就把所有模态的一线供应商接满。

### 建议目录结构

```text
packages/ai-providers/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── registry/
│   ├── errors/
│   ├── text/
│   ├── image/
│   ├── video/
│   └── providers/
│       └── <vendor>/
├── package.json
└── tsconfig.json
```

目录约束：

- `text/`、`image/`、`video/` 只放模态级接口、请求类型、结果类型和统一行为契约。
- `providers/<vendor>/` 只放厂商 SDK 适配代码，不把 SDK 原始类型直接暴露到公共 API。
- `registry/` 只负责注册和查找 provider，不负责持久化配置。
- `config/` 只负责结构化配置模型与边缘解析辅助，不负责业务规则。
- `errors/` 只负责 provider 统一错误类型和映射逻辑。

### 公共 API 设计

`@toonflow/ai-providers` 的公共 API 应保持克制，优先暴露：

- `createAiProviderRegistry(...)`
- `AiProviderRegistry`
- `TextProvider`
- `ImageProvider`
- `VideoProvider`
- 各模态的 request / result / stream chunk 类型
- 首批厂商适配工厂，例如 `createVendorTextProvider(config)`、`createVendorImageProvider(config)`

不应默认暴露：

- 厂商 SDK 原始实例
- registry 内部数据结构
- 任意未稳定的底层工具函数

### 配置与运行方式

`@toonflow/ai-providers` 的真实输入应是结构化配置对象，而不是在包内直接读取 `process.env`。

允许存在边缘配置解析函数，例如：

- `readAiProviderConfig(env)`

但其职责只限于：

- 将环境变量转为结构化配置
- 做最小字段校验和默认值填充

它不负责：

- 从数据库读取模型配置
- 决定哪个场景使用哪个 provider
- 定义业务级 fallback 策略

推荐装配方式：

```ts
const registry = createAiProviderRegistry({
  text: [createVendorTextProvider(textConfig)],
  image: [createVendorImageProvider(imageConfig)],
  video: []
});

const textProvider = registry.getTextProvider("default");
const imageProvider = registry.getImageProvider("default");
```

其中“default”的选择属于上层组合逻辑，而不是包内职责。

### 流式调用语义

`TextProvider.stream()` 在 Phase 2 中必须是正式能力，不是预留接口。

详细设计需要固定至少以下语义：

- 调用方通过统一的异步可消费结果读取流式输出
- 不暴露某家 SDK 的事件格式、回调模式或连接对象
- 流中断、流结束和流式错误要有统一表现方式
- 非流式 `invoke()` 与流式 `stream()` 对同一请求类型共享一致的输入边界

## `@toonflow/storage` 设计

### 包职责

`@toonflow/storage` 只负责：

- 文件写入与读取
- 文件存在性检查
- 文件删除与目录删除
- 图片内容的 Base64 读取
- 对外 URL 生成
- 本地存储与对象存储的抽象边界

它不负责：

- 业务目录规划
- 资源权限判断
- 上传协议适配
- 与 AI provider 的联动编排

### 首批能力基线

Phase 2 固定如下基线：

- `local storage`
  - 必须提供首个可运行实现
  - 必须作为首批验收项覆盖真实文件系统行为
- `S3-compatible storage`
  - 只在详细设计中保留接口与扩展位
  - 不纳入首批必须交付范围

### 建议目录结构

```text
packages/storage/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── errors/
│   ├── pathing/
│   └── adapters/
│       ├── local/
│       └── s3/
├── package.json
└── tsconfig.json
```

目录约束：

- `adapters/local/` 放本地文件系统实现。
- `adapters/s3/` 只保留扩展位和类型边界，不要求首批可运行。
- `pathing/` 负责路径规范化、相对路径约束和 URL 相关辅助，不承载业务目录规划。
- `config/` 只处理结构化配置模型。
- `errors/` 只处理统一错误语义。

### 公共 API 设计

`@toonflow/storage` 的公共 API 应至少暴露：

- `StorageAdapter`
- `LocalStorageConfig`
- `createLocalStorage(config)`

`StorageAdapter` 的最小能力建议固定为：

- `writeFile(path, data)`
- `getFile(path)`
- `getImageBase64(path)`
- `getFileUrl(path)`
- `fileExists(path)`
- `deleteFile(path)`
- `deleteDirectory(path)`

公共 API 不应默认暴露：

- Node.js 底层文件句柄
- 本地适配器的内部路径拼接实现
- 未稳定的对象存储实验性接口

### 配置与运行方式

`@toonflow/storage` 同样只接收结构化配置对象，不在 import 时读取环境变量或创建实例。

推荐配置字段至少包括：

- `rootDir`
- `publicBaseUrl`

可选字段可以在详细设计中扩展为：

- 路径前缀规则
- URL 路径前缀
- 文件命名策略钩子

推荐装配方式：

```ts
const storage = createLocalStorage({
  rootDir: "/data/toonflow",
  publicBaseUrl: "http://127.0.0.1:3001/files"
});
```

Phase 2 需要明确：

- 路径必须被限制在配置的根目录范围内
- URL 生成基于结构化配置，而不是运行时拼接隐式常量
- 业务层决定文件放在哪个子目录，storage 只负责安全、稳定地执行文件操作

## 错误模型设计

Phase 2 需要把“底层错误不直接外泄”写成硬约束。

`@toonflow/ai-providers` 至少需要统一区分以下错误类别：

- 配置错误
- 认证错误
- 限流或配额错误
- 调用失败
- 能力不支持
- 流式中断

`@toonflow/storage` 至少需要统一区分以下错误类别：

- 配置错误
- 非法路径
- 文件不存在
- 读写失败
- URL 配置非法

错误模型优先复用 `@toonflow/kernel` 中的共享错误码和错误基类；如果 Phase 2 需要补充错误码，应以“支撑本阶段最小语义”为原则扩展 `kernel`，而不是让每个基础设施包自定义一套错误协议。

## 测试与验证基线

Phase 2 的验收不应只看接口命名，还要看可重复验证的行为。

两个包都必须独立通过：

- `build`
- `lint`
- `typecheck`

`@toonflow/ai-providers` 的默认测试基线应包括：

- registry 行为测试
- 公共 API 导出测试
- request / result 类型契约测试
- `TextProvider.invoke()` 行为测试
- `TextProvider.stream()` 流式语义测试
- `ImageProvider.generate()` 统一结果形状测试
- 厂商适配层的 stub / mock 测试

Phase 2 不应把真实在线厂商调用设为默认 CI 基线。若后续需要，可设计为手动 smoke check 或 opt-in 集成测试。

`@toonflow/storage` 的默认测试基线应包括：

- 本地文件写入和读取
- 文件存在性检查
- 文件删除和目录删除
- 图片 Base64 读取
- URL 生成
- 非法路径保护

## Phase 2 文档实施范围

基于以上设计，Phase 2 的文档实施范围应明确为：

1. 重写 `docs/refactoring/02-ai-providers-storage.md`
   - 让其层级、语气和约束力度与 `01-database-layer.md` 对齐
2. 新增 `docs/refactoring/02-ai-providers-storage-spec.md`
   - 详细收录两个 package 的包边界、API 设计、配置约束、错误模型和测试基线

本设计本身不直接修改 `docs/refactoring` 文件，而是作为下一步 implementation plan 和文档编辑的依据。

## 风险与注意事项

- 如果在 Phase 2 文档中不明确“配置持久化不属于 provider 包”，后续容易把数据库配置管理错误地下沉到基础设施层。
- 如果不把 `stream()` 的统一语义提前写清楚，后续 API 或 Agent 层很容易被某家 SDK 的事件模型绑死。
- 如果 `storage` 不在 Phase 2 固定路径约束和 URL 生成规则，后续多入口场景下会出现路径规则漂移。
- 如果首批基线同时要求真实视频实现和对象存储实现，Phase 2 的范围会明显膨胀，影响后续 `services` 阶段节奏。

## 结论

Phase 2 的关键不是把所有 AI 与存储能力一次性做完，而是先建立两个不会被后续阶段推翻的基础设施边界。为此，本设计选择：

- 采用与 Phase 1 一致的“阶段说明 + 详细设计”双层文档结构
- 固定 `@toonflow/ai-providers` 与 `@toonflow/storage` 为并列基础设施包
- 锁定 `text + image + local storage` 的最小可落地基线
- 将 `video` 和 S3-compatible storage 保留为明确定义的扩展位
- 将配置、错误和测试语义统一收束为后续 implementation plan 可直接执行的约束
