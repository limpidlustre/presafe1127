export enum ModelProvider {
    GOOGLE = 'google',
    OPENAI = 'openai', // 包含 DeepSeek, 豆包, ChatGPT 等
}

export interface ModelConfig {
    id: string;
    name: string;
    provider: ModelProvider;
}

export const models: ModelConfig[] = [
    // --- Google Gemini 系列 ---
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: ModelProvider.GOOGLE },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: ModelProvider.GOOGLE },

    // --- 其他厂商 (走 OpenAI 协议) ---
    { id: 'deepseek-chat', name: 'DeepSeek V3', provider: ModelProvider.OPENAI },
    // { id: 'gpt-4o', name: 'GPT-4o', provider: ModelProvider.OPENAI },
    // { id: 'ep-2024...', name: '豆包 Pro', provider: ModelProvider.OPENAI },
];

// 默认导出 Model 类型以兼容旧代码引用
export type Model = string;