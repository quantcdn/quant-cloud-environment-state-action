import * as core from '@actions/core';
import {
    ApplicationsApi,
    EnvironmentsApi,
    UpdateEnvironmentStateRequest
} from 'quant-ts-client';

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
        const result = await client.updateEnvironmentState(organization, application, environment, environmentStateRequest);
        core.info('\n✅ Environment state updated successfully');
    } catch (error) {
        const err = error as Error & ApiError;
        core.error('\n❌ Failed to update environment state');
        core.setFailed(err.body?.message ?? 'Unknown error');
    }
}

run();