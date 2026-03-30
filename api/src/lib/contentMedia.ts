import crypto from 'crypto';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import sharp from 'sharp';
import type { ContentMediaAssetRef, ContentMediaSlot, UploadLoginBackgroundMediaResponse } from '../../../shared/contracts';
import { HttpError } from './http';
import { getSignedDownloadUrl } from './s3Media';
import { getS3RuntimeConfig } from './s3Config';

const allowedContentMediaMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
]);

const contentMediaSourcePrefix = 'questly-media:';
const contentMediaPrefix = (process.env.S3_CONTENT_PREFIX || 'content').replace(/^\/+|\/+$/g, '');

const contentMediaUploadSizeLimitBytes = 80 * 1024 * 1024;

type UploadableContentMediaFile = Pick<Express.Multer.File, 'buffer' | 'mimetype' | 'originalname' | 'size'>;

interface ResolvedS3ContentMediaConfig {
    bucketName: string;
    client: NonNullable<Awaited<ReturnType<typeof getS3RuntimeConfig>>['client']>;
}

export const loginBackgroundMediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 1,
        fileSize: contentMediaUploadSizeLimitBytes,
    },
    fileFilter: (_req, file, callback) => {
        if (!allowedContentMediaMimeTypes.has(file.mimetype)) {
            callback(new Error(`Unsupported background media type: ${file.mimetype}`));
            return;
        }

        callback(null, true);
    },
});

const ensureS3Configured = async (): Promise<ResolvedS3ContentMediaConfig> => {
    try {
        const config = await getS3RuntimeConfig();
        if (!config.bucketName || !config.client || !config.isConfigured) {
            throw new Error('S3 content media storage is not configured. Set S3_BUCKET_NAME and AWS_REGION.');
        }

        return {
            bucketName: config.bucketName,
            client: config.client,
        };
    } catch (error) {
        throw new HttpError(500, error instanceof Error ? error.message : 'S3 content media storage is not configured', { expose: false });
    }
};

const buildContentMediaSource = (storageKey: string) => `${contentMediaSourcePrefix}${storageKey}`;

const getStorageKeyFromContentMediaSource = (value: string | null | undefined) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue || !trimmedValue.startsWith(contentMediaSourcePrefix)) {
        return null;
    }

    return trimmedValue.slice(contentMediaSourcePrefix.length) || null;
};

const getMediaTypeFromMime = (mimeType: string): 'image' | 'video' => (
    mimeType.startsWith('video/') ? 'video' : 'image'
);

const extensionFromMime = (mimeType: string) => {
    switch (mimeType) {
        case 'image/jpeg':
            return '.jpg';
        case 'image/png':
            return '.png';
        case 'image/webp':
            return '.webp';
        case 'image/heic':
            return '.heic';
        case 'image/heif':
            return '.heif';
        case 'video/mp4':
            return '.mp4';
        case 'video/webm':
            return '.webm';
        case 'video/quicktime':
            return '.mov';
        default:
            return '';
    }
};

const buildContentMediaKey = (realmId: number, slot: ContentMediaSlot, extension: string) => (
    `${contentMediaPrefix}/${realmId}/${slot}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`
);

const getContentMediaSlotForUpload = (mediaType: 'image' | 'video'): ContentMediaSlot => (
    mediaType === 'video' ? 'login_background_video' : 'login_background_image'
);

export const buildContentMediaAssetRef = (
    slot: ContentMediaSlot,
    source: string | null | undefined,
): ContentMediaAssetRef | null => (
    getStorageKeyFromContentMediaSource(source)
        ? {
            kind: 'content_media',
            slot,
        }
        : null
);

export const signContentMediaSource = async (value: string | null | undefined) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
        return null;
    }

    const storageKey = getStorageKeyFromContentMediaSource(trimmedValue);
    if (!storageKey) {
        return trimmedValue;
    }

    return getSignedDownloadUrl(storageKey);
};

export const deleteContentMediaSource = async (value: string | null | undefined) => {
    const storageKey = getStorageKeyFromContentMediaSource(value);
    if (!storageKey) {
        return;
    }

    const { bucketName, client } = await ensureS3Configured();
    await client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
    })).catch(() => undefined);
};

export const uploadLoginBackgroundMediaFile = async (input: {
    realmId: number;
    file: UploadableContentMediaFile;
}): Promise<UploadLoginBackgroundMediaResponse> => {
    const { bucketName, client } = await ensureS3Configured();
    const mediaType = getMediaTypeFromMime(input.file.mimetype);
    const slot = getContentMediaSlotForUpload(mediaType);

    // Background images are converted to a bounded web format so branding
    // uploads stay sharp without bloating the settings payload or bucket.
    const processed = mediaType === 'image'
        ? await sharp(input.file.buffer)
            .rotate()
            .resize({
                width: 2560,
                height: 2560,
                fit: 'inside',
                withoutEnlargement: true,
            })
            .webp({ quality: 86 })
            .toBuffer()
        : input.file.buffer;
    const processedMimeType = mediaType === 'image' ? 'image/webp' : input.file.mimetype;
    const processedExtension = mediaType === 'image' ? '.webp' : extensionFromMime(processedMimeType) || '.bin';
    const storageKey = buildContentMediaKey(input.realmId, slot, processedExtension);

    await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: processed,
        ContentType: processedMimeType,
    }));

    return {
        mediaType,
        source: buildContentMediaSource(storageKey),
        url: await getSignedDownloadUrl(storageKey, {
            responseContentType: processedMimeType,
        }),
        asset: {
            kind: 'content_media',
            slot,
        },
    };
};
