
export enum Model {
    FLASH = 'gemini-2.5-flash',
    PRO = 'gemini-2.5-pro',
}

export const models = [
    { id: Model.FLASH, name: '快速模型 (Flash)' },
    { id: Model.PRO, name: '高级模型 (Pro)' },
];
