import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { Model, models } from '../constants';
import { products } from './productData';

// 辅助函数：将文件转换为不带前缀的纯 Base64 字符串
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:mime/type;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeMealSafety = async (files: File[], model: Model, additionalInfo: string): Promise<string> => {
  
  // 1. 查找当前模型属于哪个厂商 (Google 还是 OpenAI/DeepSeek)
  // 注意：这里需要 constants.ts 里导出的 models 数组包含 provider 字段
  const selectedModelConfig = models.find(m => m.id === model);
  const provider = selectedModelConfig?.provider || 'google'; // 默认为 google 以兼容旧代码

  // ==================================================================================
  // 准备提示词 (Prompts) - 无论用哪个模型，提示词都是通用的
  // ==================================================================================
  
  const dbInstruction = `**内部产品数据库：**
你有一个内部产品数据库，其中包含已知产品的详细信息。这是数据库的内容：
\`\`\`json
${JSON.stringify(products, null, 2)}
\`\`\`

**核心任务指令：**
1.  **产品匹配**：首先，根据用户上传的图片（如产品包装）或补充信息中的产品名称，判断是否与数据库中的任何产品匹配。
2.  **数据填充**：如果找到匹配项，你 **必须** 使用数据库中该产品的详细信息来填充下面的报告表格。数据库中的信息是首要的、可信的真相来源。
3.  **补充分析**：在用数据库信息填充表格后，再结合用户上传的图片（如检测试纸、实物照片、检测仪读数）和补充信息，完成剩余的分析。
4.  **无匹配项**：如果无法在数据库中找到匹配的产品，则完全基于用户提供的图片和信息来尽力填充报告。
5.  **强制检测项**：必须在“检测数据”模块中包含以下四项检测：**食品新鲜度**、**克伦特罗**、**亚硝酸盐**、**大肠杆菌**。
`;
    
  const currentDate = new Date().toLocaleDateString('zh-CN');

  const systemInstruction = `你是一个专业的预制菜安全分析师。你的任务是根据用户提供的图片（预制菜实物、包装、检测报告、试纸等）和补充信息，生成一份严格符合以下格式的《预制菜安全检测 AI分析报告》。

${dbInstruction}

**输出格式要求：**
你 **必须** 严格按照以下 Markdown 表格格式输出。
* 表格必须包含 7 列：**模块**、**二级分类**、**项目名称**、**标准/限值**、**实际内容/检测数值**、**判定结果**、**备注/溯源信息**。
* 不要更改表头名称。
* 如果某项内容为空，请使用 "—" 或 "[待填]" 占位，保持表格结构完整。
* **第1列“模块”** 相同的行，请确保首列内容一致（后续渲染会处理合并）。

\`\`\`markdown
# 预制菜安全检测AI分析报告

| 模块 | 二级分类 | 项目名称 | 标准/限值 | 实际内容/检测数值 | 判定结果 | 备注/溯源信息 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1. 采样信息 | 基础数据 | 报告编号 | — | [自动生成SC+时间戳] | — | 自动生成 |
| 1. 采样信息 | | 样品名称 | — | [填入名称/ID] | — | — |
| 1. 采样信息 | | 采样时间 | — | ${currentDate} | — | — |
| 1. 采样信息 | | 采样地点 | — | [基于信息或默认为"XX市XX区XX超市"] | — | 具体位置：熟食柜组 |
| 2. 产品档案 | 基础信息 | 制造商 | — | [数据库/图片提取] | — | — |
| 2. 产品档案 | | 生产许可证号 | — | [数据库/图片提取] | 有效 | AI核验通过 |
| 2. 产品档案 | | 贮存条件 | — | [数据库/图片提取] | — | — |
| 2. 产品档案 | | 保质期 | — | [数据库/图片提取] | — | — |
| 2. 产品档案 | | 配料表 | — | [数据库/图片提取, 简略显示] | — | 含致敏原筛查 |
| 3. 溯源信息 | 原材料1 | 肉类来源 | — | [数据库提取] | — | 批次: [自动生成] |
| 3. 溯源信息 | 原材料2 | 辅料来源 | — | [数据库提取] | — | — |
| 3. 溯源信息 | 包装信息 | 包装供应商 | — | [数据库提取] | — | 食品级PE |
| 3. 溯源信息 | 销售渠道 | 销售去向 | — | [数据库提取] | — | 渠道类型：商超 |
| 4. 检测数据 | 理化/快检 | 食品新鲜度 | ≤ 150 | [AI读取或生成] | [合格/不合格] | 检测仪：多功能食品安全检测仪 |
| 4. 检测数据 | | 克伦特罗 | ≤ 30 | [AI读取或生成] | [合格/不合格] | 检测仪：新型食品安全检测仪 |
| 4. 检测数据 | | 亚硝酸盐 | ≤ 3 | [AI读取或生成] | [合格/不合格] | 检测仪：多功能食品安全检测仪 |
| 4. 检测数据 | 微生物 | 菌落总数 | ≤ 100,000 | [AI读取或生成] | [合格/不合格] | [待填] |
| 4. 检测数据 | | 大肠杆菌 | 不得检出 | [未检出/检出] | [合格/不合格] | 检测方式：试纸/培养 |
| 4. 检测数据 | | 致病菌(沙门氏菌) | 不得检出 | [未检出/检出] | [合格/不合格] | [待填] |
| 5. 智能诊断 | 综合结论 | 最终判定 | — | [合格/不合格 (阳性)] | — | 依据：[判定依据] |
| 5. 智能诊断 | AI分析 | 污染归因 | — | [AI推断风险点] | — | 建议核查：[建议内容] |
| 5. 智能诊断 | 处置建议 | 行动指令 | — | 1.下架封存 2.追溯源头 | — | 针对批次：[当前批次] |
| 6. 审批流 | 人员签字 | 检测人 | — | 张三、李四、王五 | — | 日期：${currentDate} |
| 6. 审批流 | | 审核人 | — | 赵四 | — | 日期：${currentDate} |
| 6. 审批流 | | 批准人 | — | 孔六 | — | 日期：${currentDate} |
\`\`\`

**特别判读指南与数据生成规则：**
1.  **大肠杆菌/试纸判读**：
    * **阳性 (不合格)**: 试纸/检测显示变色反应或数值超标。
    * **阴性 (合格)**: 试纸无反应或数值为0/未检出。
    * 若无明确检测图片，且产品匹配数据库，默认生成“未检出 (合格)”。
2.  **数值模拟 (仿真演示)**：
    * 如果图片中清晰包含检测仪读数或报告数据，**必须**使用实际读取的数据。
    * 如果未提供具体检测数据，且产品在数据库中匹配良好（视为演示场景），请生成**合格范围内**的随机数值（例如：新鲜度 120-140，亚硝酸盐 1.0-2.5，克伦特罗 < 1.0 或 0）。
    * **例外**：如果用户补充信息中暗示了风险（如“肉质发酸”、“试纸变色”），则必须生成**不合格**的数值（如 新鲜度>150, 克伦特罗>30, 亚硝酸盐>3）并判定为不合格。
3.  **最终判定逻辑**：
    * 只要有**任意一项**检测数据（新鲜度、克伦特罗、亚硝酸盐、微生物等）不合格，"最终判定" 必须为 "**不合格 (阳性)**"。
    * "处置建议" 应根据判定结果调整，若不合格则显示"下架封存"，若合格则显示"正常上架"。
`;

  const userPrompt = `这是我需要你分析的预制菜。补充信息如下：\n\n${additionalInfo || '无补充信息。'}`;


  // ==================================================================================
  // 分支逻辑：根据 provider 决定使用 Google SDK 还是 OpenAI SDK
  // ==================================================================================

  // 🔴 分支 1: Google Gemini (使用原有的 GoogleGenAI SDK)
  if (provider === 'google') {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("未配置 Google API Key。请在 Vercel 环境变量中设置 VITE_GEMINI_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Gemini 格式：inlineData (无需 data:image 前缀)
    const imageParts = await Promise.all(
      files.map(async (file) => {
        const base64Data = await fileToBase64(file);
        return {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        };
      })
    );

    const contents = {
      parts: [
        { text: userPrompt },
        ...imageParts,
      ],
    };

    // 注意：Gemini 1.5 系列可能对 systemInstruction 支持更完善
    const response = await ai.models.generateContent({
      model: model as string,
      contents,
      config: {
          systemInstruction,
      }
    });

    return response.text || "生成内容为空";
  }

  // 🔵 分支 2: OpenAI 兼容厂商 (DeepSeek / 豆包 / ChatGPT)
  else {
    const apiKey = import.meta.env.VITE_LLM_API_KEY;
    const baseURL = import.meta.env.VITE_LLM_BASE_URL;

    if (!apiKey || !baseURL) {
      throw new Error(`未配置通用 LLM 环境变量。请设置 VITE_LLM_API_KEY 和 VITE_LLM_BASE_URL (当前尝试使用: ${provider})`);
    }

    // 初始化 OpenAI 客户端
    const client = new OpenAI({
      baseURL: baseURL,
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // 允许在前端使用
    });

    // OpenAI 格式：image_url (必须带 data:image 前缀)
    const imageMessages = await Promise.all(
      files.map(async (file) => {
        const rawBase64 = await fileToBase64(file);
        return {
          type: "image_url",
          image_url: {
            url: `data:${file.type};base64,${rawBase64}`,
            detail: "high"
          }
        };
      })
    );

    // 构建消息历史
    const messages: any[] = [
      {
        role: "system",
        content: systemInstruction + "\n\n" + dbInstruction // 将指令合并到 System Prompt
      },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          ...imageMessages
        ]
      }
    ];

    const response = await client.chat.completions.create({
      model: model as string, // 使用 constants.ts 中定义的模型 ID (如 'deepseek-chat')
      messages: messages,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "生成内容为空";
  }
};