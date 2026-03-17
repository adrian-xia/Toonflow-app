import u from "@/utils";
import { generateText, streamText, Output, stepCountIs, ModelMessage, LanguageModel, Tool, GenerateTextResult } from "ai";
import { wrapLanguageModel } from "ai";
import { parse } from "best-effort-json-parser";
import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createZhipu } from "zhipu-ai-provider";
import { createQwen } from "qwen-ai-provider-v5";
import { createXai } from "@ai-sdk/xai";
import { z } from "zod";

interface AIInput<T extends Record<string, z.ZodTypeAny> | undefined = undefined> {
  system?: string;
  tools?: Record<string, Tool>;
  maxStep?: number;
  output?: T;
  prompt?: string;
  messages?: Array<ModelMessage>;
}

interface AIConfig {
  model?: string;
  apiKey?: string;
  baseURL?: string;
  manufacturer?: string;
}

// 厂商实例映射
const instanceMap: Record<string, any> = {
  deepSeek: createDeepSeek,
  volcengine: createOpenAI,
  openai: createOpenAI,
  zhipu: createZhipu,
  zhipu_pool: createOpenAI,
  qwen: createQwen,
  gemini: createGoogleGenerativeAI,
  anthropic: createAnthropic,
  modelScope: (options: any) => createOpenAI({ ...options, headers: { ...options?.headers, "X-ModelScope-Async-Mode": "true" } }),
  xai: createXai,
  aliyun_coding: createOpenAI,
  other: createOpenAI,
  grsai: createOpenAI,
};

// 使用 chat 模式的厂商
const chatModelManufacturers = ["volcengine", "other", "openai", "modelScope", "grsai", "zhipu_pool", "aliyun_coding"];

const buildOptions = async (input: AIInput<any>, config: AIConfig = {}) => {
  if (!config || !config?.model || !config?.apiKey || !config?.manufacturer) throw new Error("请检查模型配置是否正确");
  const { model, apiKey, baseURL, manufacturer } = { ...config };

  // 获取厂商实例
  const createInstance = instanceMap[manufacturer];
  if (!createInstance) throw new Error(`不支持的厂商: ${manufacturer}`);

  const modelInstance = createInstance({ apiKey, baseURL: baseURL!, name: model });

  // 构建 model 函数
  const modelFn = chatModelManufacturers.includes(manufacturer)
    ? (modelInstance as OpenAIProvider).chat(model!)
    : modelInstance(model!);

  const maxStep = input.maxStep ?? (input.tools ? Object.keys(input.tools).length * 5 : undefined);

  // 默认使用 schema 格式（大部分现代模型支持）
  const responseFormat = "schema";
  const outputBuilders: Record<string, (schema: any) => any> = {
    schema: (s) => {
      return Output.object({ schema: z.object(s) });
    },
  };

  const output = input.output ? (outputBuilders[responseFormat]?.(input.output) ?? null) : null;

  return {
    config: {
      model: modelFn as LanguageModel,
      ...(input.system && { system: input.system }),
      ...(input.prompt ? { prompt: input.prompt } : { messages: input.messages! }),
      ...(input.tools && { tools: input.tools }),
      ...(maxStep && { stopWhen: stepCountIs(maxStep) }),
      ...(output && { output }),
    },
    responseFormat,
  };
};

type InferOutput<T> = T extends Record<string, z.ZodTypeAny> ? z.infer<z.ZodObject<T>> : GenerateTextResult<Record<string, Tool>, never>;

const ai = Object.create({}) as {
  invoke<T extends Record<string, z.ZodTypeAny> | undefined = undefined>(input: AIInput<T>, config?: AIConfig): Promise<InferOutput<T>>;
  stream(input: AIInput, config?: AIConfig): Promise<ReturnType<typeof streamText>>;
};

ai.invoke = async (input: AIInput<any>, config: AIConfig) => {
  const options = await buildOptions(input, config);

  const result = await generateText(options.config);
  if (options.responseFormat === "object" && input.output) {
    const pattern = /{[^{}]*}|{(?:[^{}]*|{[^{}]*})*}/g;
    const jsonLikeTexts = Array.from(result.text.matchAll(pattern), (m) => m[0]);

    const res = jsonLikeTexts.map((jsonText) => parse(jsonText));
    return res[0];
  }
  if (options.responseFormat === "schema" && input.output) {
    return JSON.parse(result.text);
  }
  return result;
};

ai.stream = async (input: AIInput, config: AIConfig) => {
  const options = await buildOptions(input, config);

  return streamText(options.config);
};

export default ai;
