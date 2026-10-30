# Quant Cloud Environment State Action

This GitHub Action updates the state of an environment in Quant Cloud.

## Usage

```yaml
- name: Update Environment State
  uses: quantcdn/quant-cloud-environment-state-action@v1
  with:
    api_key: ${{ secrets.QUANT_API_KEY }}
    organization: your-org-name
    application: your-app-name
    environment: your-env-name
    base_url: https://api.quant.cloud  # Optional
    action: redeploy  # Optional, defaults to 'redeploy'
```

## Inputs

- `api_key`: Your Quant Cloud API key (required)
- `organization`: Your Quant Cloud organisation name (required)
- `application`: Your Quant Cloud application name (required)
- `environment`: Your Quant Cloud environment name (required)
- `base_url`: Quant Cloud API base URL (optional)
- `action`: Action to perform (optional, defaults to 'redeploy')

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and release information.
## Runner security requirement

This action uses the runner's embedded Node 24, which must be 24.22.1 or later
for CVE-2026-111497. Update self-hosted runner containers/binaries to apply the
fix. A `setup-node` workflow step changes the job shell runtime, not the Node
binary GitHub uses to execute actions. A pre-run check rejects vulnerable
runner versions before action API calls. Use the current maintained action tag
or its immutable release SHA; historical pinned releases do not update themselves.
