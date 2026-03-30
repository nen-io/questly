import type { Router } from 'express';

import {
    asyncHandler,
    buildPaginatedResult,
    computeFuzzyScore,
    listAccessibleTasks,
    parsePagination,
    parseWithSchema,
    selectedCategoryScore,
    taskCatalogQuerySchema,
} from './shared';

export const registerListTasksRoute = (router: Router) => {
    router.get('/', asyncHandler(async (req, res) => {
        if (req.auth!.role !== 'player') {
            return res.json(buildPaginatedResult([], 0, 1, 12));
        }

        const filters = parseWithSchema(taskCatalogQuerySchema, req.query);
        const { page, pageSize, offset } = parsePagination(req, { pageSize: 12, maxPageSize: 50 });
        const tasks = await listAccessibleTasks(req.auth!.realmId, req.auth!.id);
        const selectedCategoryIds = filters.categoryIds ?? [];

        const filtered = tasks
            .filter((task) => {
                if (filters.collection === 'active') {
                    return task.status === 'active';
                }

                if (filters.collection === 'available') {
                    return task.status !== 'active';
                }

                return true;
            })
            .map((task) => {
                const combinedRules = [...task.rewardRules, ...task.penaltyRules];
                const categoryScore = selectedCategoryScore(selectedCategoryIds, combinedRules);
                const searchScore = computeFuzzyScore(filters.search, [
                    task.title,
                    task.description,
                    ...combinedRules.map((rule) => rule.name),
                ]);

                return {
                    task,
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

                if (left.task.status !== right.task.status) {
                    if (left.task.status === 'available') {
                        return -1;
                    }

                    if (right.task.status === 'available') {
                        return 1;
                    }

                    if (left.task.status === 'cooldown') {
                        return -1;
                    }

                    if (right.task.status === 'cooldown') {
                        return 1;
                    }
                }

                return left.task.title.localeCompare(right.task.title);
            });

        res.json(buildPaginatedResult(
            filtered.slice(offset, offset + pageSize).map((entry) => entry.task),
            filtered.length,
            page,
            pageSize,
        ));
    }));
};
