# wait-vercel-mono-deployment

[![Tests](https://github.com/iuliancmarcu/wait-vercel-mono-deployment/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/iuliancmarcu/wait-vercel-mono-deployment/actions/workflows/test.yml)

GitHub Action that waits on multiple deployments of a PR and outputs their URLs

## This Action is heavily inspired from [@patrickedqvist/wait-for-vercel-preview](https://github.com/patrickedqvist/wait-for-vercel-preview)

### Inputs

#### `token`

**Required** GitHub token

#### `actor_name`

The name of the actor that will be used when checking for a new deployment

#### `vercel_password`

Vercel password protection secret

#### `environment`

The name of the environment that was deployed to (e.g., "Preview" or "Production")

#### `max_timeout_ms`

The timeout in milliseconds to be used when running each action step

#### `allow_inactive_deployment`

Use the most recent inactive deployment (previously deployed preview) associated with the pull request if no new deployment is available.

#### `path`

The path to check. Defaults to the index of the domain

#### `check_interval_ms`

How often (in milliseconds) should we make retry HTTP requests checking the deployment?

### Outputs

#### `deployment_urls`

The URLs of the deployments
