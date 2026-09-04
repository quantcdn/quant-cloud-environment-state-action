import * as core from '@actions/core';
import {
    EnvironmentsApi,
    UpdateEnvironmentStateRequest,
    Configuration
} from '@quantcdn/quant-client';

const DEFAULT_BASE_URL = 'https://dashboard.quantcdn.io';

interface ApiError {
    response?: {
        status?: number;
        data?: {
            message?: string;
        };
    };
    message?: string;
}

/**
 * Retry a function with exponential backoff and jitter
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 5,
    attempt: number = 0
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (attempt >= maxRetries) {
            throw error;
        }

        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        core.info(`Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${(delay / 1000).toFixed(1)}s...`);

        await new Promise(resolve => setTimeout(resolve, delay));

        return retryWithBackoff(fn, maxRetries, attempt + 1);
    }
}

async function run() {
    const apiKey = core.getInput('api_key', { required: true });
    const organization = core.getInput('organization', { required: true });
    const application = core.getInput('application', { required: true });
    const environment = core.getInput('environment', { required: true });

    let baseUrl = core.getInput('base_url', { required: false });
    let action = core.getInput('action', { required: false }) || 'redeploy';

    baseUrl = baseUrl
        ? baseUrl.replace(/\/api\/v3\/?$/, '').replace(/\/+$/, '')
        : DEFAULT_BASE_URL;

    if (baseUrl !== DEFAULT_BASE_URL) {
        core.warning(`Using non-default base URL: ${baseUrl}`);
    }

    core.info('Quant Cloud Environment State Update');
    core.info('----------------------------------');
    core.info(`  * Organization: ${organization}`);
    core.info(`  * Application: ${application}`);
    core.info(`  * Environment: ${environment}`);
    core.info(`  * Action: ${action}`);

    const config = new Configuration({
        basePath: baseUrl,
        accessToken: apiKey
    });
    const client = new EnvironmentsApi(config);

    const environmentStateRequest: UpdateEnvironmentStateRequest = {
        action: action
    };

    try {
        await retryWithBackoff(
            () => client.updateEnvironmentState(organization, application, environment, environmentStateRequest)
        );
        core.info('\nEnvironment state updated successfully');
    } catch (error) {
        const err = error as Error & ApiError;
        core.error('\nFailed to update environment state after retries');
        core.setFailed(err.response?.data?.message ?? err.message ?? 'Unknown error');
    }
}

run();
