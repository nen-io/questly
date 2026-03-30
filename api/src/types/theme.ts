export type ThemeTokens = Record<string, string>;

export interface ThemePresetSeed {
    key: string;
    name: string;
    audience: string;
    description: string;
    tokens: ThemeTokens;
}

export interface PointAmount {
    categoryId: number;
    slug: string;
    name: string;
    amount: number;
}

export interface PointMapEntry {
    categoryId: number;
    name: string;
    slug: string;
    amount: number;
}
