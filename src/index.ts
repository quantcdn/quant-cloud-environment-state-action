import * as core from '@actions/core';
import {
    ApplicationsApi,
    EnvironmentsApi,
    UpdateEnvironmentStateRequest
} from '@quantcdn/quant-client';

interface ApiError {
    body?: {
        message?: string;
    }
}

const apiOpts = (apiKey: string) => {
    return{
        applyToRequest: (requestOptions: any) => {
            if (requestOptions && requestOptions.headers) {
                requestOptions.headers["Authorization"] = `Bearer ${apiKey}`;
            }
        }
    }
}

/**
 * Retry a function with exponential backoff and jitter
 * @param fn - The function to retry
 * @param maxRetries - Maximum number of retries (default: 5)
 * @param attempt - Current attempt number (used internally for recursion)
 * @returns Promise with the result of the function
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

        // Calculate backoff: exponential with jitter
        // Base delay: 2^attempt seconds (1s, 2s, 4s, 8s, 16s)
        // Jitter: random value between 0-1000ms to prevent thundering herd
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        core.info(`⏳ Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${(delay / 1000).toFixed(1)}s...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return retryWithBackoff(fn, maxRetries, attempt + 1);
    }
}

/**
 * The main function for the action.
 * @returns {Promise<void>}
 */
async function run() {
    const apiKey = core.getInput('api_key', { required: true });
    const organization = core.getInput('organization', { required: true });
    const application = core.getInput('application', { required: true });
    const environment = core.getInput('environment', { required: true });

    let baseUrl = core.getInput('base_url', { required: false });
    let action = core.getInput('action', { required: false }) ?? 'redeploy';

    if (!baseUrl) {
        baseUrl = 'https://dashboard.quantcdn.io/api/v3';
    } else {
        core.warning(`Using non-default base URL: ${baseUrl}`);
    }

    core.info('Quant Cloud Environment State Update');
    core.info('----------------------------------');
    core.info(`  • Organization: ${organization}`);
    core.info(`  • Application: ${application}`);
    core.info(`  • Environment: ${environment}`);
    core.info(`  • Action: ${action ?? 'redeploy'}`);

    const client = new EnvironmentsApi(baseUrl);
    client.setDefaultAuthentication(apiOpts(apiKey));

    const environmentStateRequest = new UpdateEnvironmentStateRequest();
    environmentStateRequest.action = action;

    try {
        const result = await retryWithBackoff(
            () => client.updateEnvironmentState(organization, application, environment, environmentStateRequest)
        );
        core.info('\n✅ Environment state updated successfully');
    } catch (error) {
        const err = error as Error & ApiError;
        core.error('\n❌ Failed to update environment state after retries');
        core.setFailed(err.body?.message ?? 'Unknown error');
    }
}

run();