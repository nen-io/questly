import type { Router } from 'express';

import {
    asyncHandler,
    buildPaginatedResult,
    computeFuzzyScore,
    listAccessibleRewards,
    parsePagination,
    parseWithSchema,
    rewardCatalogQuerySchema,
    selectedCategoryScore,
} from './shared';

export const registerListRewardsRoute = (router: Router) => {
    router.get('/', asyncHandler(async (req, res) => {
        if (req.auth!.role !== 'player') {
            return res.json(buildPaginatedResult([], 0, 1, 12));
        }

        const filters = parseWithSchema(rewardCatalogQuerySchema, req.query);
        const { page, pageSize, offset } = parsePagination(req, { pageSize: 12, maxPageSize: 50 });
        const selectedCategoryIds = filters.categoryIds ?? [];
        const rewardItems = await listAccessibleRewards(req.auth!.realmId, req.auth!.id);

        const filtered = rewardItems
            .filter((reward) => {
                const owned = reward.latestPurchase?.status === 'purchased';
                if (filters.collection === 'owned') {
                    return owned;
                }

                if (filters.collection === 'available') {
                    return !owned;
                }

                return true;
            })
            .map((reward) => {
                const categoryScore = selectedCategoryScore(selectedCategoryIds, reward.costs);
                const searchScore = computeFuzzyScore(filters.search, [
                    reward.title,
                    reward.description,
                    ...reward.costs.map((cost) => cost.name),
                ]);

                return {
                    reward,
                    categoryScore,
                    searchScore,
                };
            })
            .filter((entry) => {
                if (selectedCategoryIds.length > 0 && entry.categoryScore === 0) {
                    return false;
                }

                if ((filters.search ?? '').trim().length > 0 && entry.searchScore === 0) {
                    return false;
                }

                return true;
            })
            .sort((left, right) => {
                if (right.categoryScore !== left.categoryScore) {
                    return right.categoryScore - left.categoryScore;
                }

                if (right.searchScore !== left.searchScore) {
                    return right.searchScore - left.searchScore;
                }

                return left.reward.title.localeCompare(right.reward.title);
            });

        res.json(buildPaginatedResult(
            filtered.slice(offset, offset + pageSize).map((entry) => entry.reward),
            filtered.length,
            page,
            pageSize,
        ));
    }));
};
