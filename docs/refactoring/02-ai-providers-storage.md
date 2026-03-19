# Phase 2: AI 提供商 + 存储层提取

## 目标

把 AI 调用与文件存储从入口层和业务层中抽离，形成两个独立包：

- `packages/ai-providers`
- `packages/storage`

它们都应通过显式依赖注入被上层消费，而不是挂在全局工具对象上。

---

## `packages/ai-providers`

### 职责

- 文本模型调用
- 图像模型调用
- 视频模型调用
- 模型注册与配置解析
- 厂商差异适配

### 建议结构

```text
packages/ai-providers/
├── src/
│   ├── index.ts
│   ├── text/
│   ├── image/
│   ├── video/
│   └── registry.ts
├── package.json
└── tsconfig.json
```

### 接口方向

```ts
textProvider.invoke(input, config);
textProvider.stream(input, config);
imageProvider.generate(config);
videoProvider.generate(config);
```

约束：

- 不依赖 Express、Electron 或前端
- 厂商 SDK 封装不泄漏到上层业务代码
- 共享类型与错误放在 `@toonflow/kernel`

---

## `packages/storage`

### 职责

- 文件读写
- URL 生成
- 图片 Base64 读取
- 本地与对象存储抽象

### 建议结构

```text
packages/storage/
├── src/
│   ├── index.ts
│   ├── interface.ts
│   ├── local.ts
│   └── s3.ts
├── package.json
└── tsconfig.json
```

### 接口示例

```ts
interface StorageAdapter {
  getFileUrl(filePath: string): string;
  getFile(filePath: string): Promise<Buffer>;
  getImageBase64(filePath: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  deleteDirectory(dirPath: string): Promise<void>;
  writeFile(filePath: string, data: Buffer | string): Promise<string>;
  fileExists(filePath: string): Promise<boolean>;
}
```

---

## 集成方式

上层通过显式构造组合依赖：

```ts
import { createTextProvider } from "@toonflow/ai-providers";
import { createLocalStorage } from "@toonflow/storage";

const text = createTextProvider(providerConfig);
const storage = createLocalStorage(storageConfig);
```

不再通过 `apps/api/src/utils.ts` 或其他兼容层回挂为全局对象。

---

## 验证标准

- `packages/ai-providers` 和 `packages/storage` 均可独立通过 `build`、`lint`、`typecheck`
- 文本 / 图像 / 视频调用能被上层包直接消费
- 文件读写与 URL 解析具备直接测试覆盖
- 依赖注入路径清晰，没有全局单例回流

---

## 风险与注意事项

- AI provider 的配置来源需要和 `packages/db` 解耦设计清楚
- 存储路径规则要兼顾 API、MCP 与 Electron 多入口
- 供应商 SDK 更新频率高，接口包装要避免把变更扩散到服务层
