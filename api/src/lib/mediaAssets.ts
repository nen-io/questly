import { and, eq } from 'drizzle-orm';
import type { RefreshableAssetRef, RefreshedAsset } from '../../../shared/contracts';
import { db } from '../db/client';
import { contentBlocks, taskRunMedia, taskRuns, tasks, users } from '../db/schema';
import { signAvatarStorageKey } from './avatar';
import { signContentMediaSource } from './contentMedia';
import { HttpError } from './http';
import { extensionFromMime, getSignedDownloadUrl } from './s3Media';

const buildTaskRunMediaDownloadFileName = (
    mediaId: number,
    originalName: string | null,
    mimeType: string,
) => {
    const trimmedOriginalName = originalName?.trim();
    if (trimmedOriginalName) {
        return trimmedOriginalName;
    }

    return `win-media-${mediaId}${extensionFromMime(mimeType)}`;
};

const refreshAvatarAsset = async (realmId: number, userId: number): Promise<RefreshedAsset> => {
    const [user] = await db.select({
        avatarStorageKey: users.avatarStorageKey,
    })
        .from(users)
        .where(and(
            eq(users.id, userId),
            eq(users.realmId, realmId),
        ))
        .limit(1);

    if (!user) {
        throw new HttpError(404, 'Avatar not found');
    }

    return {
        asset: {
            kind: 'avatar',
            userId,
        },
        url: await signAvatarStorageKey(user.avatarStorageKey),
    };
};

const refreshTaskRunMediaAsset = async (
    realmId: number,
    mediaId: number,
    variant: 'full' | 'thumbnail',
): Promise<RefreshedAsset> => {
    const [media] = await db.select({
        storageKey: taskRunMedia.storageKey,
        thumbnailStorageKey: taskRunMedia.thumbnailStorageKey,
    })
        .from(taskRunMedia)
        .innerJoin(taskRuns, eq(taskRuns.id, taskRunMedia.taskRunId))
        .innerJoin(tasks, eq(tasks.id, taskRuns.taskId))
        .where(and(
            eq(taskRunMedia.id, mediaId),
            eq(tasks.realmId, realmId),
        ))
        .limit(1);

    if (!media) {
        throw new HttpError(404, 'Media item not found');
    }

    const storageKey = variant === 'thumbnail' ? media.thumbnailStorageKey : media.storageKey;

    return {
        asset: {
            kind: 'task_run_media',
            mediaId,
            variant,
        },
        url: await getSignedDownloadUrl(storageKey),
    };
};

const contentMediaKeyBySlot = {
    login_background_image: 'login_background_image_url',
    login_background_video: 'login_background_video_url',
} as const;

const refreshContentMediaAsset = async (
    realmId: number,
    slot: keyof typeof contentMediaKeyBySlot,
): Promise<RefreshedAsset> => {
    const [row] = await db.select({
        value: contentBlocks.value,
    })
        .from(contentBlocks)
        .where(and(
            eq(contentBlocks.realmId, realmId),
            eq(contentBlocks.key, contentMediaKeyBySlot[slot]),
        ))
        .limit(1);

    return {
        asset: {
            kind: 'content_media',
            slot,
        },
        url: await signContentMediaSource(row?.value ?? null),
    };
};

export const refreshSignedAssetUrl = async (realmId: number, asset: RefreshableAssetRef): Promise<RefreshedAsset> => {
    switch (asset.kind) {
        case 'avatar':
            return refreshAvatarAsset(realmId, asset.userId);
        case 'content_media':
            return refreshContentMediaAsset(realmId, asset.slot);
        case 'task_run_media':
            return refreshTaskRunMediaAsset(realmId, asset.mediaId, asset.variant);
        default:
            throw new HttpError(400, 'Unsupported media refresh request');
    }
};

export const getTaskRunMediaDownloadUrl = async (realmId: number, mediaId: number) => {
    const [media] = await db.select({
        storageKey: taskRunMedia.storageKey,
        mimeType: taskRunMedia.mimeType,
        originalName: taskRunMedia.originalName,
    })
        .from(taskRunMedia)
        .innerJoin(taskRuns, eq(taskRuns.id, taskRunMedia.taskRunId))
        .innerJoin(tasks, eq(tasks.id, taskRuns.taskId))
        .where(and(
            eq(taskRunMedia.id, mediaId),
            eq(tasks.realmId, realmId),
        ))
        .limit(1);

    if (!media) {
        throw new HttpError(404, 'Media item not found');
    }

    return getSignedDownloadUrl(media.storageKey, {
        downloadFileName: buildTaskRunMediaDownloadFileName(mediaId, media.originalName, media.mimeType),
        responseContentType: media.mimeType,
    });
};
