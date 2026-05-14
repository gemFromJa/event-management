import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AccountRecovery,
  StringAttribute,
  UserPool,
  UserPoolClient,
} from "aws-cdk-lib/aws-cognito";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { SSM_PARAMS } from "@event-manager/shared";

export class AuthStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      passwordPolicy: {
        // simple for the demo
        minLength: 8,
        requireUppercase: false,
        requireSymbols: false,
        requireDigits: false,
      },
      customAttributes: {
        role: new StringAttribute({ mutable: true }),
      },
    });

    const userPoolClient = new UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: {
        userPassword: true,
      },
    });

    new StringParameter(this, "UserPoolArnParam", {
      parameterName: SSM_PARAMS.auth.userPoolArn,
      stringValue: userPool.userPoolArn,
    });

    new StringParameter(this, "UserPoolClientIdParam", {
      parameterName: SSM_PARAMS.auth.userPoolClientId,
      stringValue: userPoolClient.userPoolClientId,
    });

    new StringParameter(this, "UserPoolIdParam", {
      parameterName: SSM_PARAMS.auth.userPoolId,
      stringValue: userPool.userPoolId,
    });
  }
}
