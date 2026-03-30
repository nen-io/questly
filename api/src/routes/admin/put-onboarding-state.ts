import type { Router } from 'express';

import {
    handleRouteError,
    normalizeOnboardingStep,
    parseWithSchema,
    publishInvalidate,
    saveRealmOnboardingState,
    updateOnboardingStatePayloadSchema,
} from './shared';

export const registerPutOnboardingStateRoute = (router: Router) => {
    router.put('/onboarding/state', async (req, res) => {
        try {
            const payload = parseWithSchema(updateOnboardingStatePayloadSchema, req.body);
            const setup = await saveRealmOnboardingState({
                realmId: req.auth!.realmId,
                currentStep: payload.currentStep ? normalizeOnboardingStep(payload.currentStep) : undefined,
                completedSteps: payload.completedSteps?.map((step) => normalizeOnboardingStep(step)),
                lastVisitedStep: payload.lastVisitedStep ? normalizeOnboardingStep(payload.lastVisitedStep) : undefined,
            });

            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.onboarding_state_updated',
                queryKeys: [['session'], ['admin-bootstrap'], ['admin-onboarding-bootstrap'], ['public-config']],
            });

            res.json(setup);
        } catch (error) {
            return handleRouteError(req, res, error, {
                event: 'admin.onboarding.state.update.failed',
                fallbackMessage: 'Unable to update onboarding progress',
            });
        }
    });
};
