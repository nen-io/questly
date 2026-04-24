import crypto from 'crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import type { AvatarAssetRef } from '../../../shared/contracts';
import { HttpError } from './http';
import { forceHttpsMediaUrl } from './mediaUrl';
import { getS3RuntimeConfig } from './s3Config';

const avatarPrefix = (process.env.S3_AVATAR_PREFIX || 'avatars').replace(/^\/+|\/+$/g, '');

interface ResolvedS3AvatarConfig {
    bucketName: string;
    client: NonNullable<Awaited<ReturnType<typeof getS3RuntimeConfig>>['client']>;
    signedUrlExpirySeconds: number;
}

const ensureS3Configured = async (): Promise<ResolvedS3AvatarConfig> => {
    try {
        const config = await getS3RuntimeConfig();
        if (!config.bucketName || !config.client || !config.isConfigured) {
            throw new Error('S3 avatar storage is not configured. Set S3_BUCKET_NAME and AWS_REGION.');
        }

        return {
            bucketName: config.bucketName,
            client: config.client,
            signedUrlExpirySeconds: config.signedUrlExpirySeconds,
        };
    } catch (error) {
        throw new HttpError(500, error instanceof Error ? error.message : 'S3 avatar storage is not configured', { expose: false });
    }
};

const parseDataUrl = (value: string) => {
    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        throw new HttpError(400, 'Avatar must be a valid image data URL');
    }

    const mimeType = match[1];
    const body = Buffer.from(match[2], 'base64');

    if (body.length === 0 || body.length > 8 * 1024 * 1024) {
        throw new HttpError(400, 'Avatar image is too large');
    }

    return {
        mimeType,
        body,
    };
};

const buildAvatarKey = (realmId: number, userId: number) => (
    `${avatarPrefix}/${realmId}/${userId}/${crypto.randomUUID()}.webp`
);

export const buildAvatarAssetRef = (userId: number, storageKey: string | null | undefined): AvatarAssetRef | null => (
    storageKey
        ? {
            kind: 'avatar',
            userId,
        }
        : null
);

export const getAvatarPresentation = async (userId: number, storageKey: string | null | undefined) => ({
    avatarUrl: await signAvatarStorageKey(storageKey),
    avatarAsset: buildAvatarAssetRef(userId, storageKey),
});

export const uploadAvatarFromDataUrl = async (input: {
    realmId: number;
    userId: number;
    dataUrl: string;
    previousStorageKey?: string | null;
}) => {
    const { bucketName, client } = await ensureS3Configured();
    const { body } = parseDataUrl(input.dataUrl);

    const processed = await sharp(body)
        .rotate()
        .resize(256, 256, {
            fit: 'cover',
            position: 'centre',
            withoutEnlargement: false,
        })
        .webp({ quality: 86 })
        .toBuffer();

    const storageKey = buildAvatarKey(input.realmId, input.userId);
    await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: processed,
        ContentType: 'image/webp',
    }));

    if (input.previousStorageKey) {
        await client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: input.previousStorageKey,
        })).catch(() => undefined);
    }

    return storageKey;
};

export const deleteAvatarStorageKey = async (storageKey: string | null | undefined) => {
    if (!storageKey) {
        return;
    }

    const { bucketName, client } = await ensureS3Configured();
    await client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
    })).catch(() => undefined);
};

export const signAvatarStorageKey = async (storageKey: string | null | undefined) => {
    const { bucketName, client, isConfigured, signedUrlExpirySeconds } = await getS3RuntimeConfig();
    if (!storageKey || !isConfigured || !client || !bucketName) {
        return null;
    }

    return forceHttpsMediaUrl(await getSignedUrl(client, new GetObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
    }), { expiresIn: signedUrlExpirySeconds }));
};
