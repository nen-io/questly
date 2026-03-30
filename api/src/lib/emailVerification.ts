import crypto from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { emailVerificationTokens, users } from '../db/schema';
import { getRealmPresentation } from './content';
import { canSendEmail, renderThemedEmail, sendEmail } from './email';
import { HttpError } from './http';
import { logInfo } from './logger';

const verificationExpiryHours = Number(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || 24);

export const createEmailVerificationToken = async (userId: number, email: string) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + verificationExpiryHours * 60 * 60 * 1000);

    await db.insert(emailVerificationTokens).values({
        userId,
        email,
        token,
        expiresAt,
    });

    return { token, expiresAt };
};

export const sendVerificationEmail = async (userId: number, realmId: number, email: string, displayName: string) => {
    const { token } = await createEmailVerificationToken(userId, email);
    if (!canSendEmail()) {
        logInfo('email_verification.skipped_unconfigured', {
            userId,
            realmId,
            email,
        });
        return { sent: false, reason: 'SMTP not configured' };
    }

    const presentation = await getRealmPresentation(realmId);
    const verifyUrl = `${process.env.APP_BASE_URL}?verifyEmailToken=${token}`;
    const html = renderThemedEmail({
        appName: presentation.settings.platformName,
        eyebrow: 'Verify email',
        heading: 'Confirm your email address',
        intro: 'Verify your address to unlock email notifications for quest activity, rewards, and comments.',
        bodyHtml: `
          <p style="margin:0 0 18px;">Hi ${displayName.split(' ')[0] || displayName},</p>
          <p style="margin:0 0 18px;">You can keep using the app without email, but verification is required before we send any notification emails.</p>
          <p style="margin:0;">This verification link expires in ${verificationExpiryHours} hours.</p>
        `,
        ctaLabel: 'Verify email',
        ctaUrl: verifyUrl,
        footer: 'If you did not request this, you can ignore this email.',
        theme: presentation.theme.tokens,
    });

    await sendEmail({
        to: email,
        subject: `${presentation.settings.platformName}: verify your email`,
        html,
    });

    return { sent: true };
};

export const verifyEmailToken = async (token: string) => {
    const [record] = await db.select().from(emailVerificationTokens).where(and(
        eq(emailVerificationTokens.token, token),
        isNull(emailVerificationTokens.consumedAt),
        gt(emailVerificationTokens.expiresAt, new Date()),
    )).limit(1);

    if (!record) {
        throw new HttpError(400, 'Verification link is invalid or expired');
    }

    await db.transaction(async (tx) => {
        await tx.update(users)
            .set({
                email: record.email,
                emailVerifiedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(users.id, record.userId));

        await tx.update(emailVerificationTokens)
            .set({ consumedAt: new Date() })
            .where(eq(emailVerificationTokens.id, record.id));
    });

    return record;
};
