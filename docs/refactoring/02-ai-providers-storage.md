# Phase 2: AI 提供商 + 存储层提取

## 目标

将 AI 调用和文件存储独立为可复用包，与业务逻辑解耦。

---

## 当前状态

### AI 抽象层 (`src/utils/ai/`)

| 文件 | 说明 |
|------|------|
| `text/index.ts` | `invoke()` + `stream()`，支持 13 个厂商后端（deepSeek、volcengine、openai、zhipu、qwen、gemini、anthropic 等） |
| `text/modelList.ts` | 50+ 文本模型定义 |
| `image/index.ts` | 图像生成调度器 |
| `image/type.ts` | `ImageConfig` 全局接口 |
| `image/modelList.ts` | 图像模型列表 |
| `image/owned/` | 各厂商图像实现 |
| `video/index.ts` | 视频生成调度器 |
| `video/type.ts` | `VideoConfig` 全局接口 |
| `video/modelList.ts` | 40+ 视频模型定义 |
| `video/owned/` | 各厂商视频实现 |
| `utils.ts` | `validateVideoConfig()`、`pollTask()` |

使用方式：通过 `u.ai.text.invoke()` / `u.ai.text.stream()` / `u.ai.image` / `u.ai.video`

### 文件存储 (`src/utils/oss.ts`)

- `OSS` 类，本地文件存储实现
- 方法：`getFileUrl`、`getFile`、`getImageBase64`、`deleteFile`、`deleteDirectory`、`writeFile`、`fileExists`
- 路径安全校验（`is-path-inside`）
- Electron 感知的根目录选择

---

## 2.1 `@toonflow/ai-providers`

### 包结构

```
packages/ai-providers/
├── src/
│   ├── index.ts
│   ├── text/
│   │   ├── index.ts       # invoke() + stream() 接口
│   │   └── modelList.ts   # 模型定义
│   ├── image/
│   │   ├── index.ts       # 图像生成调度
│   │   ├── type.ts        # 接口定义
│   │   ├── modelList.ts
│   │   └── owned/         # 各厂商实现
│   ├── video/
│   │   ├── index.ts       # 视频生成调度
│   │   ├── type.ts        # 接口定义
│   │   ├── modelList.ts
│   │   └── owned/         # 各厂商实现
│   └── utils.ts
├── package.json
└── tsconfig.json
```

### 关键接口保持不变

```typescript
ai.text.invoke(input, config)   // 同步调用，返回完整结果
ai.text.stream(input, config)   // 流式调用，实时返回生成内容
ai.image.generate(config)       // 图像生成
ai.video.generate(config)       // 视频生成
```

### 依赖

| 依赖 | 用途 |
|------|------|
| `@toonflow/kernel` | 类型定义 |
| `@toonflow/db` | 读取 `t_config` 表获取模型配置 |
| `ai` | Vercel AI SDK v6 |
| `@ai-sdk/*` | 各厂商 SDK |

---

## 2.2 `@toonflow/storage`

### 包结构

```
packages/storage/
├── src/
│   ├── index.ts
│   ├── interface.ts    # IStorage 接口
│   └── local.ts        # LocalStorage 实现
├── package.json
└── tsconfig.json
```

### 接口抽象

```typescript
interface IStorage {
  getFileUrl(filePath: string): string;
  getFile(filePath: string): Promise<Buffer>;
  getImageBase64(filePath: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  deleteDirectory(dirPath: string): Promise<void>;
  writeFile(filePath: string, data: Buffer | string): Promise<string>;
  fileExists(filePath: string): Promise<boolean>;
}
```

当前实现为 `LocalStorage`，未来可扩展 `S3Storage`、`OSSStorage` 等。

---

## 2.3 兼容层

在 `apps/api/src/utils.ts` 中通过兼容层保持现有调用方式不变：

```typescript
import { AIText, AIImage, AIVideo } from "@toonflow/ai-providers";
import { LocalStorage } from "@toonflow/storage";

export default {
  ai: { text: AIText, image: AIImage, video: AIVideo },
  oss: new LocalStorage(rootDir),
  // ... 其他保持不变
};
```

---

## 验证标准

- AI 调用（text / image / video）功能正常
- 文件上传 / 下载功能正常
- `pnpm lint` 通过

---

## 风险

| 风险点 | 说明 |
|--------|------|
| 全局接口导出 | `ImageConfig`、`VideoConfig` 需改为显式导出 |
| 数据库依赖 | AI 模型配置依赖数据库，`ai-providers` 需依赖 `@toonflow/db` |
| Electron 路径处理 | Electron 环境下的根目录路径需通过配置注入，不能硬编码 |
