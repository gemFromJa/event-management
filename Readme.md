# Anifest — Event Management Platform

A serverless event platform for anime and movie events. Organizers create and manage events, attendees discover and register for them.

---

## Prerequisites

- Node.js 20+
- pnpm 9+ — `npm install -g pnpm`
- AWS CLI v2 — configured with `aws configure`
- AWS CDK v2 — `npm install -g aws-cdk`
- AWS SAM CLI — `brew install aws/tap/aws-sam-cli`
- AWS account setup — `aws configure`

---

## Environment Setup

**Root `.env`** (copy from `.env.example`):

```bash
AWS_ACCOUNT_ID=your-12-digit-account-id
AWS_REGION=us-east-1
FROM_EMAIL=your-verified-ses-email@example.com
```

**`packages/client/.env`** is generated automatically after deploying — see below.

---

## First Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Build project deps
pnpm build

# 3. Deploy infrastructure (required before running locally)
pnpm deploy:infra

# 4. Run client locally
pnpm dev:client
```

`deploy:infra` creates the DynamoDB tables, Cognito user pool and API Gateway, then writes `packages/client/.env` automatically.

---

## Build

```bash
# build everything (shared + client)
pnpm build

# build shared package only
pnpm --filter @event-manager/shared build

# build client only
pnpm --filter client build
```

---

## Deploy

```bash
# full deploy — infra + frontend
pnpm deploy

# deploy infra only (Lambda, API Gateway, Cognito, DynamoDB)
pnpm deploy:infra

# deploy frontend only (builds client then uploads to S3)
pnpm deploy:frontend
```

After `deploy:infra` completes, `packages/client/.env` is written automatically with the API URL and Cognito config.

---

## Local Development

Local Lambda functions run via SAM CLI and connect to your real AWS DynamoDB and Cognito. Deploy the infrastructure at least once before running locally.

```bash
# runs frontend + local API together
pnpm dev

# run local API only (AWS SAM)
pnpm dev:cli

# run frontend only
pnpm dev:client
```

- Frontend runs at `http://localhost:5173`
- Local API runs at `http://localhost:3001`

The frontend automatically uses the local API in dev mode via `packages/client/.env.local`.

Create it manually and update following .env.example

---

## Tests

```bash
# run all tests
pnpm test

# server tests only
pnpm --filter server test

# client tests only
pnpm --filter client test
```

---

## Common Issues

**`cdk bootstrap` fails**
Ensure AWS credentials are set: `aws sts get-caller-identity`

**`Stack not found` during sync-env**
Deploy the infra stacks first: `pnpm deploy:infra`

**Client shows blank page or API errors**
Run `pnpm deploy:infra` to regenerate `packages/client/.env`, then restart dev server.

**Local API not connecting to DynamoDB**
Ensure `DbStack` and `AuthStack` are deployed and `packages/infra/env.local.json` has the correct table names and Cognito IDs.

**Login always returns 401**
Check the `Authorization` header is sending the access token not the ID token. Tokens expire after 1 hour — try logging out and back in.

**SES emails not sending**
In sandbox mode, both sender and recipient emails must be verified in AWS Console → SES → Verified Identities.

**`esbuild` not found during deploy**
```bash
pnpm add -D esbuild --filter infra
```