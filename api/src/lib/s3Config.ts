import { HeadBucketCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

const parseBoolean = (value: string | undefined) => (
    typeof value === 'string' && ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
);

const trimEnv = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
};

export interface S3RuntimeConfig {
    bucketName: string | undefined;
    client: S3Client | null;
    isConfigured: boolean;
    signedUrlExpirySeconds: number;
}

interface StaticS3Config {
    accessKeyId: string | undefined;
    bucketName: string | undefined;
    endpoint: string | undefined;
    forcePathStyle: boolean;
    region: string | undefined;
    secretAccessKey: string | undefined;
    sessionToken: string | undefined;
    signedUrlExpirySeconds: number;
}

let resolvedBucketRegion: string | null = null;
let resolvedBucketRegionPromise: Promise<string> | null = null;

const buildStaticS3Config = (): StaticS3Config => {
    const bucketName = trimEnv(process.env.S3_BUCKET_NAME);
    const region = trimEnv(process.env.AWS_REGION);
    const endpoint = trimEnv(process.env.S3_ENDPOINT);
    const accessKeyId = trimEnv(process.env.AWS_ACCESS_KEY_ID);
    const secretAccessKey = trimEnv(process.env.AWS_SECRET_ACCESS_KEY);
    const sessionToken = trimEnv(process.env.AWS_SESSION_TOKEN);
    const forcePathStyle = parseBoolean(process.env.S3_FORCE_PATH_STYLE);
    const signedUrlExpirySeconds = Math.max(60, Number(process.env.S3_SIGNED_URL_TTL_SECONDS || 900));

    return {
        accessKeyId,
        bucketName,
        endpoint,
        forcePathStyle,
        region,
        secretAccessKey,
        sessionToken,
        signedUrlExpirySeconds,
    };
};

const buildClientConfig = (config: StaticS3Config, regionOverride?: string): S3ClientConfig => ({
    region: regionOverride ?? config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    followRegionRedirects: !config.endpoint,
    credentials: config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            sessionToken: config.sessionToken,
        }
        : undefined,
});

const createS3Client = (config: StaticS3Config, regionOverride?: string) => {
    const region = regionOverride ?? config.region;
    if (!config.bucketName || !region) {
        return null;
    }

    return new S3Client(buildClientConfig(config, region));
};

const getBucketRegionFromError = (error: unknown) => {
    if (!error || typeof error !== 'object') {
        return undefined;
    }

    const typedError = error as {
        BucketRegion?: unknown;
        $response?: {
            headers?: Record<string, string | undefined>;
        };
    };

    if (typeof typedError.BucketRegion === 'string') {
        return trimEnv(typedError.BucketRegion);
    }

    return trimEnv(typedError.$response?.headers?.['x-amz-bucket-region']);
};

const validateStaticS3Config = (featureLabel: string) => {
    const config = buildStaticS3Config();

    if (!config.bucketName || !config.region) {
        throw new Error(`${featureLabel} is not configured. Set S3_BUCKET_NAME and AWS_REGION.`);
    }

    if (!config.accessKeyId || !config.secretAccessKey) {
        throw new Error(`${featureLabel} is missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY.`);
    }

    if (config.accessKeyId.includes('/')) {
        throw new Error(`${featureLabel} has an invalid AWS_ACCESS_KEY_ID. It cannot contain "/". Check your compose env values.`);
    }

    return config;
};

const resolveBucketRegion = async (featureLabel: string) => {
    const config = validateStaticS3Config(featureLabel);

    if (config.endpoint || resolvedBucketRegion) {
        return resolvedBucketRegion ?? config.region!;
    }

    if (!resolvedBucketRegionPromise) {
        resolvedBucketRegionPromise = (async () => {
            const client = createS3Client(config);
            if (!client) {
                return config.region!;
            }

            try {
                const response = await client.send(new HeadBucketCommand({
                    Bucket: config.bucketName!,
                }));

                const bucketRegion = trimEnv(response.BucketRegion) ?? config.region!;
                resolvedBucketRegion = bucketRegion;
                return bucketRegion;
            } catch (error) {
                const bucketRegion = getBucketRegionFromError(error);
                if (bucketRegion) {
                    resolvedBucketRegion = bucketRegion;
                    return bucketRegion;
                }

                throw new Error(
                    `${featureLabel} could not resolve the bucket region. ${error instanceof Error ? error.message : 'Unknown S3 error'}`,
                );
            }
        })().catch((error) => {
            resolvedBucketRegionPromise = null;
            throw error;
        });
    }

    return resolvedBucketRegionPromise;
};

export const getS3RuntimeConfig = async (): Promise<S3RuntimeConfig> => {
    const config = buildStaticS3Config();
    const client = createS3Client(config);

    if (!config.bucketName || !config.region || !client) {
        return {
            bucketName: config.bucketName,
            client: null,
            isConfigured: false,
            signedUrlExpirySeconds: config.signedUrlExpirySeconds,
        };
    }

    const resolvedRegion = await resolveBucketRegion('S3 storage');
    return {
        bucketName: config.bucketName,
        client: createS3Client(config, resolvedRegion),
        isConfigured: true,
        signedUrlExpirySeconds: config.signedUrlExpirySeconds,
    };
};

export const assertValidS3Config = (featureLabel: string) => {
    const config = validateStaticS3Config(featureLabel);
    const client = createS3Client(config);
    if (!client) {
        throw new Error(`${featureLabel} is not configured. Set S3_BUCKET_NAME and AWS_REGION.`);
    }

    return {
        bucketName: config.bucketName,
        client,
        signedUrlExpirySeconds: config.signedUrlExpirySeconds,
    };
};
