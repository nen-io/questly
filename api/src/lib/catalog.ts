const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();

const isSubsequence = (needle: string, haystack: string) => {
    let cursor = 0;
    for (const char of haystack) {
        if (char === needle[cursor]) {
            cursor += 1;
            if (cursor === needle.length) {
                return true;
            }
        }
    }

    return needle.length === 0;
};

const scoreAgainstField = (term: string, field: string) => {
    if (!term || !field) {
        return 0;
    }

    if (field === term) {
        return 120;
    }

    if (field.startsWith(term)) {
        return 90;
    }

    if (field.includes(term)) {
        return 60;
    }

    return isSubsequence(term, field) ? 24 : 0;
};

export const computeFuzzyScore = (query: string | undefined, fields: Array<string | null | undefined>) => {
    const normalizedQuery = normalizeText(query ?? '');
    if (!normalizedQuery) {
        return 0;
    }

    const terms = normalizedQuery.split(' ').filter(Boolean);
    const normalizedFields = fields.map((field) => normalizeText(field ?? '')).filter(Boolean);

    let total = 0;
    for (const term of terms) {
        let bestScore = 0;
        for (const field of normalizedFields) {
            bestScore = Math.max(bestScore, scoreAgainstField(term, field));
        }

        if (bestScore === 0) {
            return 0;
        }

        total += bestScore;
    }

    return total;
};

export const selectedCategoryScore = (
    selectedIds: number[],
    rules: Array<{ categoryId: number; amount: number }>,
) => {
    if (selectedIds.length === 0) {
        return 0;
    }

    const selectedSet = new Set(selectedIds);
    return rules.reduce((sum, rule) => (
        selectedSet.has(rule.categoryId) ? sum + Math.abs(rule.amount) : sum
    ), 0);
};
