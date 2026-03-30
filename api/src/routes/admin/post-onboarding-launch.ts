import type { Router } from 'express';

import { handleRouteError, launchRealmOnboarding, publishInvalidate } from './shared';

export const registerPostOnboardingLaunchRoute = (router: Router) => {
    router.post('/onboarding/launch', async (req, res) => {
        try {
            const setup = await launchRealmOnboarding(req.auth!.realmId);
            publishInvalidate({
                realmId: req.auth!.realmId,
                reason: 'admin.onboarding_launched',
                queryKeys: [['session'], ['admin-bootstrap'], ['admin-onboarding-bootstrap'], ['public-config']],
            });
            res.json(setup);
        } catch (error) {
            const blockers = (error as Error & { blockers?: string[] }).blockers;
            if (blockers && blockers.length > 0) {
                return res.status(400).json({
                    error: blockers[0],
                    blockers,
                });
            }

            return handleRouteError(req, res, error, {
                event: 'admin.onboarding.launch.failed',
                fallbackMessage: 'Unable to launch onboarding',
            });
        }
    });
};
