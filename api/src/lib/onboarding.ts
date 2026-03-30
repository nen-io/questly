import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { pointCategories, realmOnboardingState, realmSettings, users } from '../db/schema';
import {
    firstOnboardingStep,
    normalizeOnboardingStep,
    onboardingSteps,
    type OnboardingRouteStep,
    type OnboardingStatus,
    type OnboardingStep,
    type SetupState,
} from '../../../shared/contracts';

const launchedCompletedSteps = [...onboardingSteps];
const requiredLaunchSteps: OnboardingRouteStep[] = ['identity'];

const uniqueSteps = (steps: OnboardingStep[]) => {
    const seen = new Set<OnboardingRouteStep>();
    return steps
        .map((step) => normalizeOnboardingStep(step))
        .filter((step) => {
            if (seen.has(step)) {
                return false;
            }

            seen.add(step);
            return true;
        });
};

const normalizeStateRow = (row: typeof realmOnboardingState.$inferSelect | undefined) => {
    if (!row) {
        return null;
    }

    const completedSteps = Array.isArray(row.completedSteps)
        ? uniqueSteps(row.completedSteps.filter((step): step is OnboardingStep => typeof step === 'string'))
        : [];

    return {
        ...row,
        status: row.status as OnboardingStatus,
        currentStep: normalizeOnboardingStep(row.currentStep),
        lastVisitedStep: normalizeOnboardingStep(row.lastVisitedStep),
        completedSteps,
    };
};

export const ensureRealmOnboardingState = async (realmId: number) => {
    const [existing] = await db.select().from(realmOnboardingState).where(eq(realmOnboardingState.realmId, realmId)).limit(1);
    const normalized = normalizeStateRow(existing);
    if (normalized) {
        return normalized;
    }

    const [settings] = await db.select().from(realmSettings).where(eq(realmSettings.realmId, realmId)).limit(1);
    const launched = settings?.onboardingCompleted ?? false;
    const [created] = await db.insert(realmOnboardingState).values({
        realmId,
        status: launched ? 'launched' : 'not_started',
        currentStep: launched ? 'launch' : firstOnboardingStep,
        completedSteps: launched ? launchedCompletedSteps : [],
        lastVisitedStep: launched ? 'launch' : firstOnboardingStep,
        launchedAt: launched ? new Date() : null,
        updatedAt: new Date(),
    }).returning();

    return normalizeStateRow(created)!;
};

export const getLaunchReadiness = async (realmId: number, completedSteps?: OnboardingRouteStep[]) => {
    const [playerCountRow, categoryCountRow] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(
            eq(users.realmId, realmId),
            eq(users.role, 'player'),
            eq(users.status, 'active'),
        )),
        db.select({ count: sql<number>`count(*)::int` }).from(pointCategories).where(and(
            eq(pointCategories.realmId, realmId),
            eq(pointCategories.isActive, true),
        )),
    ]);

    const completed = new Set(completedSteps ?? []);
    const requirements = {
        identityConfigured: completed.has('identity'),
        landingConfigured: completed.has('identity'),
        hasPlayer: (playerCountRow[0]?.count ?? 0) > 0,
        hasAttribute: (categoryCountRow[0]?.count ?? 0) > 0,
    };

    const launchBlockers: string[] = [];
    if (!requirements.identityConfigured || !requirements.landingConfigured) {
        launchBlockers.push('Save the identity, theme, and sign-in surface step.');
    }
    if (!requirements.hasPlayer) {
        launchBlockers.push('Create at least one active player.');
    }
    if (!requirements.hasAttribute) {
        launchBlockers.push('Create at least one active kudos track.');
    }

    return {
        playerCount: playerCountRow[0]?.count ?? 0,
        categoryCount: categoryCountRow[0]?.count ?? 0,
        requirements,
        launchBlockers,
    };
};

export const getRealmSetupState = async (realmId: number): Promise<SetupState> => {
    const state = await ensureRealmOnboardingState(realmId);
    const readiness = await getLaunchReadiness(realmId, state.completedSteps);
    const isLaunched = state.status === 'launched';

    return {
        status: state.status,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        lastVisitedStep: state.lastVisitedStep,
        launchedAt: state.launchedAt ? state.launchedAt.toISOString() : null,
        isLaunched,
        allowPlayerLogin: isLaunched,
        launchBlockers: readiness.launchBlockers,
        requirements: readiness.requirements,
    };
};

export const saveRealmOnboardingState = async ({
    realmId,
    currentStep,
    completedSteps,
    lastVisitedStep,
    replaceCompletedSteps = false,
}: {
    realmId: number
    currentStep?: OnboardingStep
    completedSteps?: OnboardingRouteStep[]
    lastVisitedStep?: OnboardingRouteStep
    replaceCompletedSteps?: boolean
}) => {
    const existing = await ensureRealmOnboardingState(realmId);
    const mergedCompletedSteps = replaceCompletedSteps
        ? uniqueSteps(completedSteps ?? existing.completedSteps)
        : uniqueSteps([
            ...existing.completedSteps,
            ...(completedSteps ?? []),
        ]);
    const nextCurrentStep = currentStep ?? existing.currentStep;
    const nextLastVisitedStep = lastVisitedStep ?? currentStep ?? existing.lastVisitedStep;
    const nextStatus: OnboardingStatus = existing.status === 'launched'
        ? 'launched'
        : mergedCompletedSteps.length > 0 || nextCurrentStep !== firstOnboardingStep || nextLastVisitedStep !== firstOnboardingStep
            ? 'in_progress'
            : existing.status;

    await db.update(realmOnboardingState)
        .set({
            status: nextStatus,
            currentStep: nextCurrentStep,
            completedSteps: mergedCompletedSteps,
            lastVisitedStep: nextLastVisitedStep,
            updatedAt: new Date(),
        })
        .where(eq(realmOnboardingState.id, existing.id));

    return getRealmSetupState(realmId);
};

export const markRealmOnboardingInProgress = async (realmId: number) => {
    const existing = await ensureRealmOnboardingState(realmId);
    if (existing.status === 'launched' || existing.status === 'in_progress') {
        return getRealmSetupState(realmId);
    }

    await db.update(realmOnboardingState)
        .set({
            status: 'in_progress',
            updatedAt: new Date(),
        })
        .where(eq(realmOnboardingState.id, existing.id));

    return getRealmSetupState(realmId);
};

export const launchRealmOnboarding = async (realmId: number) => {
    const existing = await ensureRealmOnboardingState(realmId);
    const mergedCompletedSteps = uniqueSteps([...existing.completedSteps, 'launch', ...requiredLaunchSteps]);
    const readiness = await getLaunchReadiness(realmId, mergedCompletedSteps);

    if (readiness.launchBlockers.length > 0) {
        const error = new Error('Unable to launch onboarding');
        (error as Error & { blockers?: string[] }).blockers = readiness.launchBlockers;
        throw error;
    }

    await db.transaction(async (tx) => {
        await tx.update(realmOnboardingState)
            .set({
                status: 'launched',
                currentStep: 'launch',
                completedSteps: mergedCompletedSteps,
                lastVisitedStep: 'launch',
                launchedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(realmOnboardingState.id, existing.id));

        await tx.update(realmSettings)
            .set({
                onboardingCompleted: true,
                updatedAt: new Date(),
            })
            .where(eq(realmSettings.realmId, realmId));
    });

    return getRealmSetupState(realmId);
};
