#!/usr/bin/env node
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { DbStack } from "../lib/db-stack";
import { AuthStack } from "../lib/auth-stack";
import { ServerStack } from "../lib/server-stack";
import { FrontendStack } from "../lib/frontend-stack";

const env = {
  account: process.env.AWS_ACCOUNT_ID,
  region: process.env.AWS_REGION ?? "us-east-1",
};

const app = new cdk.App();

new DbStack(app, "DbStack", { env });
new AuthStack(app, "AuthStack", { env });
new FrontendStack(app, "FrontendStack", { env });
new ServerStack(app, "ServerStack", {
  env,
});
