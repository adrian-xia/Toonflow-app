/**
 * 厂商配置文件
 * 定义支持的 AI 厂商、模型、URL 和协议类型
 */

export interface ManufacturerConfig {
  value: string // 厂商标识
  label: string // 显示名称
  baseUrl: string // 默认 API URL
  protocol: 'openai' | 'claude' // 协议类型
  models: string[] // 支持的模型列表
  description?: string // 厂商描述
}

// 文本模型厂商配置
export const textManufacturers: ManufacturerConfig[] = [
  {
    value: 'aliyun_coding',
    label: '阿里云 Coding Plan',
    baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
    protocol: 'openai', // 使用 OpenAI 标准协议
    models: ['qwen3.5-plus', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5'],
    description: '阿里云百炼 Coding Plan，支持多厂商模型统一接入'
  }
  // 后续可添加其他厂商，如：
  // {
  //   value: 'anthropic',
  //   label: 'Anthropic Claude',
  //   baseUrl: 'https://api.anthropic.com',
  //   protocol: 'claude', // 使用 Claude 协议
  //   models: ['claude-sonnet-4-6', 'claude-opus-4-6'],
  //   description: 'Anthropic Claude 官方 API'
  // },
  // {
  //   value: 'openai',
  //   label: 'OpenAI',
  //   baseUrl: 'https://api.openai.com/v1',
  //   protocol: 'openai',
  //   models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  //   description: 'OpenAI 官方 API'
  // },
  // {
  //   value: 'deepseek',
  //   label: 'DeepSeek',
  //   baseUrl: 'https://api.deepseek.com/v1',
  //   protocol: 'openai',
  //   models: ['deepseek-chat', 'deepseek-reasoner'],
  //   description: 'DeepSeek API'
  // }
]

// 根据类型返回厂商列表（目前只返回文本模型厂商）
export function getManufacturersByType(type: 'text' | 'image' | 'video'): ManufacturerConfig[] {
  switch (type) {
    case 'text':
      return textManufacturers
    case 'image':
      return [] // 图像模型暂不实现
    case 'video':
      return [] // 视频模型暂不实现
    default:
      return []
  }
}

// 根据厂商标识返回配置
export function getManufacturerConfig(manufacturer: string): ManufacturerConfig | undefined {
  return textManufacturers.find(config => config.value === manufacturer)
}