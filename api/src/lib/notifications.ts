import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { notifications, users } from '../db/schema';
import { getRealmPresentation } from './content';
import { canSendEmail, renderThemedEmail, sendEmail } from './email';
import { logError, logInfo, logWarn, serializeError } from './logger';
import { publishInvalidate, publishNotificationEvent } from './realtime';

export type NotificationType =
    | 'quest_completed'
    | 'task_created'
    | 'task_updated'
    | 'reward_created'
    | 'reward_updated'
    | 'win_commented';

interface CreateNotificationInput {
    realmId: number;
    recipientUserIds: number[];
    actorUserId?: number | null;
    type: NotificationType;
    title: string;
    body: string;
    link?: string | null;
    metadata?: Record<string, unknown>;
    emailSubject: string;
    emailIntro: string;
}

export const createNotifications = async (input: CreateNotificationInput) => {
    const recipientIds = Array.from(new Set(
        input.recipientUserIds.filter((value) => Number.isInteger(value) && value > 0 && value !== input.actorUserId),
    ));

    if (recipientIds.length === 0) {
        logInfo('notifications.skipped_no_recipients', {
            realmId: input.realmId,
            type: input.type,
        });
        return [];
    }

    const [presentation, recipients] = await Promise.all([
        getRealmPresentation(input.realmId),
        db.select({
            id: users.id,
            displayName: users.displayName,
            email: users.email,
            emailVerifiedAt: users.emailVerifiedAt,
            emailNotificationsEnabled: users.emailNotificationsEnabled,
        }).from(users).where(and(
            inArray(users.id, recipientIds),
            eq(users.status, 'active'),
        )),
    ]);

    const inserted = recipients.length > 0
        ? await db.insert(notifications).values(recipients.map((recipient) => ({
            realmId: input.realmId,
            recipientUserId: recipient.id,
            actorUserId: input.actorUserId ?? null,
            type: input.type,
            title: input.title,
            body: input.body,
            link: input.link ?? null,
            metadata: input.metadata ?? null,
            emailStatus: 'pending',
        }))).returning()
        : [];

    if (!canSendEmail()) {
        if (inserted.length > 0) {
            logWarn('notifications.email_skipped_unconfigured', {
                realmId: input.realmId,
                type: input.type,
                notificationCount: inserted.length,
            });
            await db.update(notifications)
                .set({ emailStatus: 'skipped', emailError: 'SMTP not configured' })
                .where(inArray(notifications.id, inserted.map((item) => item.id)));
        }

        return inserted;
    }

    for (const notification of inserted) {
        const recipient = recipients.find((item) => item.id === notification.recipientUserId);
        if (!recipient || !recipient.email || !recipient.emailVerifiedAt || !recipient.emailNotificationsEnabled) {
            logInfo('notifications.email_skipped_recipient_unavailable', {
                realmId: input.realmId,
                type: input.type,
                notificationId: notification.id,
                recipientUserId: notification.recipientUserId,
            });
            await db.update(notifications)
                .set({ emailStatus: 'skipped', emailError: 'Recipient email unavailable or not verified' })
                .where(eq(notifications.id, notification.id));
            continue;
        }

        try {
            const html = renderThemedEmail({
                appName: presentation.settings.platformName,
                eyebrow: presentation.theme.name,
                heading: input.title,
                intro: input.emailIntro,
                bodyHtml: `
                  <p style="margin:0 0 18px;">Hi ${recipient.displayName.split(' ')[0] || recipient.displayName},</p>
                  <p style="margin:0 0 18px;">${input.body}</p>
                `,
                ctaLabel: input.link ? 'Open platform' : undefined,
                ctaUrl: input.link ? `${process.env.APP_BASE_URL}${input.link}` : undefined,
                footer: 'You are receiving this because email notifications are enabled and your address is verified.',
                theme: presentation.theme.tokens,
            });

            await sendEmail({
                to: recipient.email,
                subject: input.emailSubject,
                html,
            });

            await db.update(notifications)
                .set({
                    emailStatus: 'sent',
                    emailedAt: new Date(),
                    emailError: null,
                })
                .where(eq(notifications.id, notification.id));
            logInfo('notifications.email_sent', {
                realmId: input.realmId,
                type: input.type,
                notificationId: notification.id,
                recipientUserId: notification.recipientUserId,
            });
        } catch (error) {
            logError('notifications.email_failed', {
                realmId: input.realmId,
                type: input.type,
                notificationId: notification.id,
                recipientUserId: notification.recipientUserId,
                error: serializeError(error),
            });
            await db.update(notifications)
                .set({
                    emailStatus: 'failed',
                    emailError: error instanceof Error ? error.message : 'Email send failed',
                })
                .where(eq(notifications.id, notification.id));
        }
    }

    if (inserted.length > 0) {
        publishInvalidate({
            realmId: input.realmId,
            reason: `notifications.${input.type}`,
            queryKeys: [['notifications'], ['session']],
            userIds: inserted.map((item) => item.recipientUserId),
        });

        inserted.forEach((notification) => {
            publishNotificationEvent({
                realmId: input.realmId,
                userId: notification.recipientUserId,
                notification: {
                    id: notification.id,
                    title: notification.title,
                    body: notification.body,
                    link: notification.link,
                    type: notification.type,
                    createdAt: notification.createdAt.toISOString(),
                },
            });
        });
    }

    return inserted;
};

export const listNotificationsForUser = async (userId: number) => db.select().from(notifications)
    .where(eq(notifications.recipientUserId, userId));

export const markNotificationRead = async (notificationId: number, userId: number) => {
    const [existing] = await db.select().from(notifications).where(and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientUserId, userId),
    )).limit(1);

    if (!existing) {
        return null;
    }

    if (existing.readAt) {
        return existing;
    }

    const [updated] = await db.update(notifications)
        .set({ readAt: new Date() })
        .where(and(
            eq(notifications.id, notificationId),
            eq(notifications.recipientUserId, userId),
        ))
        .returning();

    return updated ?? null;
};

export const markAllNotificationsRead = async (userId: number) => db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(
        eq(notifications.recipientUserId, userId),
        isNull(notifications.readAt),
    ));
