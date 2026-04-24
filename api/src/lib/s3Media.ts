import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import sharp from 'sharp';
import type { TaskRunMediaAssetRef } from '../../../shared/contracts';
import { forceHttpsMediaUrl } from './mediaUrl';
import { getS3RuntimeConfig } from './s3Config';

const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
]);

const mediaPrefix = (process.env.S3_MEDIA_PREFIX || 'wins').replace(/^\/+|\/+$/g, '');

export const taskRunMediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 10,
        fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
            return;
        }

        cb(null, true);
    },
});

export interface TaskRunMediaProcessingDraft {
    mediaType: 'image' | 'video';
    mimeType: string;
    storageKey: string;
    thumbnailStorageKey: string;
    thumbnailMimeType: string;
    originalName: string | null;
    sizeBytes: number;
    sortOrder: number;
}

export interface QueuedTaskRunMediaJobDraft {
    mediaType: 'image' | 'video';
    mimeType: string;
    storageKey: string;
    originalName: string | null;
    sizeBytes: number;
    sortOrder: number;
}

export interface UploadedTaskRunMediaSourceResult {
    draft: QueuedTaskRunMediaJobDraft;
    uploadedKeys: string[];
}

export interface TaskRunMediaFileSource {
    buffer: Buffer;
    mimeType: string;
    originalName: string | null;
    sizeBytes: number;
}

interface ResolvedS3MediaConfig {
    bucketName: string;
    client: NonNullable<Awaited<ReturnType<typeof getS3RuntimeConfig>>['client']>;
    signedUrlExpirySeconds: number;
}

const ensureS3Configured = async (): Promise<ResolvedS3MediaConfig> => {
    const config = await getS3RuntimeConfig();
    if (!config.bucketName || !config.client || !config.isConfigured) {
        throw new Error('S3 media storage is not configured. Set S3_BUCKET_NAME and AWS_REGION.');
    }

    return {
        bucketName: config.bucketName,
        client: config.client,
        signedUrlExpirySeconds: config.signedUrlExpirySeconds,
    };
};

const isFfmpegAvailable = () => spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

const getMediaTypeFromMime = (mimeType: string): 'image' | 'video' => (
    mimeType.startsWith('video/') ? 'video' : 'image'
);

export const extensionFromMime = (mimeType: string) => {
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

const createStorageKey = (input: {
    realmId: number;
    userId: number;
    variant: 'full' | 'thumbnails';
    mimeType: string;
    extensionOverride?: string;
}) => {
    const dateSegment = new Date().toISOString().slice(0, 10);
    const extension = input.extensionOverride ?? extensionFromMime(input.mimeType);
    return `${mediaPrefix}/${input.variant}/${input.realmId}/${input.userId}/${dateSegment}/${crypto.randomUUID()}${extension}`;
};

export const buildTaskRunMediaAssetRef = (
    mediaId: number,
    variant: 'full' | 'thumbnail',
): TaskRunMediaAssetRef => ({
    kind: 'task_run_media',
    mediaId,
    variant,
});

const createVideoFallbackThumbnail = (label: string) => {
    const safeLabel = label.replace(/[<>&"]/g, '').slice(0, 28) || 'Video memory';
    return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d65c65" />
      <stop offset="100%" stop-color="#f2b880" />
    </linearGradient>
  </defs>
  <rect width="640" height="480" rx="36" fill="url(#bg)" />
  <circle cx="320" cy="210" r="74" fill="rgba(255,255,255,0.2)" />
  <polygon points="300,165 300,255 375,210" fill="#ffffff" />
  <text x="320" y="336" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="30" font-weight="700">${safeLabel}</text>
  <text x="320" y="380" text-anchor="middle" fill="rgba(255,255,255,0.88)" font-family="sans-serif" font-size="20">Video memory</text>
</svg>`.trim());
};

const generateImageThumbnail = async (file: TaskRunMediaFileSource) => ({
    buffer: await sharp(file.buffer)
        .rotate()
        .resize(520, 520, {
            fit: 'cover',
            position: 'centre',
            withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer(),
    mimeType: 'image/webp',
    extension: '.webp',
});

const generateVideoThumbnail = async (file: TaskRunMediaFileSource) => {
    if (!isFfmpegAvailable()) {
        return {
            buffer: createVideoFallbackThumbnail(file.originalName || 'Video memory'),
            mimeType: 'image/svg+xml',
            extension: '.svg',
        };
    }

    const sourcePath = path.join(os.tmpdir(), `${crypto.randomUUID()}${extensionFromMime(file.mimeType)}`);
    const outputPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.jpg`);

    try {
        await fs.promises.writeFile(sourcePath, file.buffer);

        const result = spawnSync('ffmpeg', [
            '-y',
            '-ss',
            '00:00:01',
            '-i',
            sourcePath,
            '-frames:v',
            '1',
            '-vf',
            'scale=640:-1',
            outputPath,
        ], { stdio: 'ignore' });

        if (result.status !== 0 || !fs.existsSync(outputPath)) {
            return {
                buffer: createVideoFallbackThumbnail(file.originalName || 'Video memory'),
                mimeType: 'image/svg+xml',
                extension: '.svg',
            };
        }

        return {
            buffer: await fs.promises.readFile(outputPath),
            mimeType: 'image/jpeg',
            extension: '.jpg',
        };
    } finally {
        await Promise.allSettled([
            fs.promises.rm(sourcePath, { force: true }),
            fs.promises.rm(outputPath, { force: true }),
        ]);
    }
};

const uploadBufferToS3 = async (key: string, body: Buffer, contentType: string) => {
    const { bucketName, client } = await ensureS3Configured();
    await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
};

const toTaskRunMediaFileSource = (
    input: Express.Multer.File | TaskRunMediaFileSource,
): TaskRunMediaFileSource => ({
    buffer: input.buffer,
    mimeType: 'mimetype' in input ? input.mimetype : input.mimeType,
    originalName: 'originalname' in input ? input.originalname || null : input.originalName,
    sizeBytes: 'size' in input ? input.size : input.sizeBytes,
});

export const uploadTaskRunMediaOriginalFiles = async (input: {
    realmId: number;
    userId: number;
    files: Array<Express.Multer.File | TaskRunMediaFileSource>;
    startingSortOrder?: number;
}): Promise<UploadedTaskRunMediaSourceResult[]> => {
    await ensureS3Configured();
    const startingSortOrder = input.startingSortOrder ?? 0;

    return Promise.all(input.files.map((rawFile, index) => uploadTaskRunMediaOriginalFile({
        realmId: input.realmId,
        userId: input.userId,
        file: rawFile,
        sortOrder: startingSortOrder + index,
    })));
};

export const uploadTaskRunMediaOriginalFile = async (input: {
    realmId: number;
    userId: number;
    file: Express.Multer.File | TaskRunMediaFileSource;
    sortOrder: number;
}): Promise<UploadedTaskRunMediaSourceResult> => {
    await ensureS3Configured();

    const file = toTaskRunMediaFileSource(input.file);
    const storageKey = createStorageKey({
        realmId: input.realmId,
        userId: input.userId,
        variant: 'full',
        mimeType: file.mimeType,
    });

    await uploadBufferToS3(storageKey, file.buffer, file.mimeType);

    return {
        draft: {
            mediaType: getMediaTypeFromMime(file.mimeType),
            mimeType: file.mimeType,
            storageKey,
            originalName: file.originalName,
            sizeBytes: file.sizeBytes,
            sortOrder: input.sortOrder,
        },
        uploadedKeys: [storageKey],
    };
};

export const downloadS3ObjectBuffer = async (storageKey: string) => {
    const { bucketName, client } = await ensureS3Configured();
    const response = await client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
    }));

    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
        throw new Error(`Unable to read S3 object ${storageKey}`);
    }

    return Buffer.from(bytes);
};

export const createTaskRunMediaProcessingDraft = async (input: {
    realmId: number;
    userId: number;
    file: TaskRunMediaFileSource;
    storageKey: string;
    sortOrder: number;
}): Promise<TaskRunMediaProcessingDraft> => {
    const file = toTaskRunMediaFileSource(input.file);
    const mediaType = getMediaTypeFromMime(file.mimeType);
    const thumbnail = mediaType === 'image'
        ? await generateImageThumbnail(file)
        : await generateVideoThumbnail(file);
    const thumbnailStorageKey = createStorageKey({
        realmId: input.realmId,
        userId: input.userId,
        variant: 'thumbnails',
        mimeType: thumbnail.mimeType,
        extensionOverride: thumbnail.extension,
    });

    await uploadBufferToS3(thumbnailStorageKey, thumbnail.buffer, thumbnail.mimeType);

    return {
        mediaType,
        mimeType: file.mimeType,
        storageKey: input.storageKey,
        thumbnailStorageKey,
        thumbnailMimeType: thumbnail.mimeType,
        originalName: file.originalName,
        sizeBytes: file.sizeBytes,
        sortOrder: input.sortOrder,
    };
};

export const deleteS3Objects = async (keys: string[]) => {
    if (keys.length === 0) {
        return;
    }

    const { bucketName, client } = await ensureS3Configured();

    await Promise.allSettled(keys.map((key) => client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
    }))));
};

const buildDownloadContentDisposition = (fileName: string) => {
    const fallbackFileName = fileName
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]+/g, '')
        .replace(/["\\]/g, '')
        .replace(/[;]+/g, '')
        .trim() || 'download';
    const encodedFileName = encodeURIComponent(fileName).replace(/['()*]/g, (character) => (
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    ));

    return `attachment; filename="${fallbackFileName}"; filename*=UTF-8''${encodedFileName}`;
};

export const getSignedDownloadUrl = async (
    storageKey: string,
    options?: {
        downloadFileName?: string | null;
        responseContentType?: string | null;
    },
) => {
    const { bucketName, client, signedUrlExpirySeconds } = await ensureS3Configured();
    return forceHttpsMediaUrl(await getSignedUrl(client, new GetObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        ResponseContentDisposition: options?.downloadFileName
            ? buildDownloadContentDisposition(options.downloadFileName)
            : undefined,
        ResponseContentType: options?.responseContentType ?? undefined,
    }), { expiresIn: signedUrlExpirySeconds }))!;
};

export const signTaskRunMediaItem = async (item: {
    id: number;
    mediaType: string;
    mimeType: string;
    storageKey: string;
    thumbnailStorageKey: string;
    thumbnailMimeType: string;
    originalName: string | null;
    sizeBytes: number | null;
}) => ({
    id: item.id,
    mediaType: item.mediaType as 'image' | 'video',
    mimeType: item.mimeType,
    originalName: item.originalName,
    sizeBytes: item.sizeBytes,
    fullUrl: await getSignedDownloadUrl(item.storageKey),
    fullAsset: buildTaskRunMediaAssetRef(item.id, 'full'),
    thumbnailUrl: await getSignedDownloadUrl(item.thumbnailStorageKey),
    thumbnailAsset: buildTaskRunMediaAssetRef(item.id, 'thumbnail'),
    thumbnailMimeType: item.thumbnailMimeType,
});
