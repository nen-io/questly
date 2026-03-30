import { logError, logInfo, serializeError } from './logger';
import { sweepOverdueTaskRuns } from './tasks';

const defaultSweepIntervalMs = 5 * 60 * 1000;
const minimumSweepIntervalMs = 60 * 1000;

const resolveSweepIntervalMs = () => {
    const rawValue = Number(process.env.TASK_EXPIRY_SWEEP_INTERVAL_MS ?? defaultSweepIntervalMs);

    if (!Number.isFinite(rawValue) || rawValue < minimumSweepIntervalMs) {
        return defaultSweepIntervalMs;
    }

    return rawValue;
};

export const startTaskExpirySweep = () => {
    const intervalMs = resolveSweepIntervalMs();
    let isSweepInFlight = false;

    const runSweep = async (trigger: 'startup' | 'interval') => {
        if (isSweepInFlight) {
            return;
        }

        isSweepInFlight = true;

        try {
            const expiredRuns = await sweepOverdueTaskRuns();
            if (expiredRuns.length > 0) {
                logInfo('tasks.expiry_sweep.completed', {
                    trigger,
                    intervalMs,
                    expiredRunCount: expiredRuns.length,
                });
            }
        } catch (error) {
            logError('tasks.expiry_sweep.failed', {
                trigger,
                intervalMs,
                error: serializeError(error),
            });
        } finally {
            isSweepInFlight = false;
        }
    };

    const timer = setInterval(() => {
        void runSweep('interval');
    }, intervalMs);

    // The sweep should never keep the process alive by itself.
    timer.unref?.();

    logInfo('tasks.expiry_sweep.started', {
        intervalMs,
    });

    void runSweep('startup');

    return () => {
        clearInterval(timer);
        logInfo('tasks.expiry_sweep.stopped', {
            intervalMs,
        });
    };
};
