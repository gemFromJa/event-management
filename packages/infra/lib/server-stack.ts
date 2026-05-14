import path from "node:path";
import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { ITable, Table } from "aws-cdk-lib/aws-dynamodb";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { SSM_PARAMS } from "@event-manager/shared";

const workspaceRoot = path.resolve(__dirname, "../../..");

export class ServerStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // ── tables ─────────────────────────────────────────────────────────────
    const eventsTable = Table.fromTableName(
      this,
      "EventsTable",
      StringParameter.valueForStringParameter(this, SSM_PARAMS.db.eventsTable)
    );
    const eventAttendeesTable = Table.fromTableName(
      this,
      "EventAttendeesTable",
      StringParameter.valueForStringParameter(
        this,
        SSM_PARAMS.db.attendeesTable
      )
    );
    const usersTable = Table.fromTableName(
      this,
      "UsersTable",
      StringParameter.valueForStringParameter(this, SSM_PARAMS.db.usersTable)
    );

    // ── auth ───────────────────────────────────────────────────────────────
    const userPoolArn = StringParameter.valueForStringParameter(
      this,
      SSM_PARAMS.auth.userPoolArn
    );
    const userPoolId = StringParameter.valueForStringParameter(
      this,
      SSM_PARAMS.auth.userPoolId
    );
    const userPoolClientId = StringParameter.valueForStringParameter(
      this,
      SSM_PARAMS.auth.userPoolClientId
    );

    const userPool = UserPool.fromUserPoolArn(this, "UserPool", userPoolArn);
    const userPoolClient = UserPoolClient.fromUserPoolClientId(
      this,
      "UserPoolClient",
      userPoolClientId
    );
    const authorizer = new HttpUserPoolAuthorizer(
      "CognitoAuthorizer",
      userPool,
      {
        userPoolClients: [userPoolClient],
      }
    );

    // ── API ────────────────────────────────────────────────────────────────
    const api = new HttpApi(this, "EventsApi", {
      apiName: "events-manager-api",
      corsPreflight: {
        allowOrigins: ["*"], // for real world, i'ld set to frontend domain
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["content-type", "authorization"],
      },
    });

    // ── helpers ────────────────────────────────────────────────────────────
    const defaultEnv = {
      EVENTS_TABLE: eventsTable.tableName,
      EVENT_ATTENDEES_TABLE: eventAttendeesTable.tableName,
    };

    const cognitoEnv = {
      USER_POOL_ID: userPoolId,
      USER_POOL_CLIENT_ID: userPoolClientId,
      USERS_TABLE: usersTable.tableName,
    };

    /**
     * Creates a Lambda function with standard configuration.
     * @param filePath - Path relative to the workspace root e.g. `packages/server/src/functions/events/create.ts`
     */
    const createFn = ({
      name,
      filePath,
      environment = defaultEnv,
      tables = [eventsTable, eventAttendeesTable],
      requiresAuth = false,
    }: {
      name: string;
      filePath: string;
      environment?: Record<string, string>;
      tables?: ITable[];
      requiresAuth?: boolean;
    }) => {
      const fn = new NodejsFunction(this, name, {
        runtime: Runtime.NODEJS_24_X,
        entry: path.join(workspaceRoot, filePath),
        handler: "handler",
        projectRoot: workspaceRoot,
        depsLockFilePath: path.join(workspaceRoot, "pnpm-lock.yaml"),
        environment: requiresAuth
          ? { ...environment, USERS_TABLE: usersTable.tableName }
          : environment,
      });

      if (requiresAuth) usersTable.grantReadData(fn);
      for (const table of tables) table.grantReadWriteData(fn);

      return fn;
    };

    const addRoute = (
      routePath: string,
      method: HttpMethod,
      fn: NodejsFunction,
      integrationId: string,
      protected_ = false
    ) =>
      api.addRoutes({
        path: routePath,
        methods: [method],
        integration: new HttpLambdaIntegration(integrationId, fn),
        ...(protected_ ? { authorizer } : {}),
      });

    // ── events ─────────────────────────────────────────────────────────────
    const listEventsFn = createFn({
      name: "ListEventsHandler",
      filePath: "packages/server/src/functions/events/search.ts",
    });
    addRoute("/events", HttpMethod.GET, listEventsFn, "ListEventsIntegration");

    const createEventFn = createFn({
      name: "CreateEventHandler",
      filePath: "packages/server/src/functions/events/create.ts",
      requiresAuth: true,
    });
    addRoute(
      "/events",
      HttpMethod.POST,
      createEventFn,
      "CreateEventIntegration",
      true
    );

    const myEventsFn = createFn({
      name: "OrganizerEventsHandler",
      filePath: "packages/server/src/functions/events/my-events.ts",
      requiresAuth: true,
    });
    addRoute(
      "/events/me",
      HttpMethod.GET,
      myEventsFn,
      "OrganizerEventsIntegration",
      true
    );

    const eventAttendeesFn = createFn({
      name: "EventAttendeesHandler",
      filePath: "packages/server/src/functions/events/attendees.ts",
      requiresAuth: true,
    });
    addRoute(
      "/events/{id}/attendees",
      HttpMethod.GET,
      eventAttendeesFn,
      "EventAttendeesIntegration",
      true
    );

    // ── registration ───────────────────────────────────────────────────────
    const registerFn = createFn({
      name: "RegisterForEventHandler",
      filePath: "packages/server/src/functions/events/register.ts",
      environment: { ...defaultEnv, FROM_EMAIL: process.env.FROM_EMAIL ?? "" },
      requiresAuth: true,
    });
    registerFn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );
    addRoute(
      "/events/{eventId}/register",
      HttpMethod.POST,
      registerFn,
      "RegisterForEventIntegration",
      true
    );

    const cancelRegistrationFn = createFn({
      name: "CancelRegistrationHandler",
      filePath: "packages/server/src/functions/attendees/cancel.ts",
      requiresAuth: true,
    });
    addRoute(
      "/events/{id}/register",
      HttpMethod.DELETE,
      cancelRegistrationFn,
      "CancelRegistrationIntegration",
      true
    );

    const myRegistrationsFn = createFn({
      name: "AttendeeEventsHandler",
      filePath: "packages/server/src/functions/attendees/my-events.ts",
      requiresAuth: true,
    });
    addRoute(
      "/attendees/me",
      HttpMethod.GET,
      myRegistrationsFn,
      "AttendeeEventsIntegration",
      true
    );

    // ── auth ───────────────────────────────────────────────────────────────
    const signupFn = createFn({
      name: "SignupHandler",
      filePath: "packages/server/src/functions/auth/signup.ts",
      environment: cognitoEnv,
      tables: [usersTable],
    });
    signupFn.addToRolePolicy(
      new PolicyStatement({
        actions: [
          "cognito-idp:SignUp",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:AdminDeleteUser",
        ],
        resources: [userPool.userPoolArn],
      })
    );
    addRoute("/auth/signup", HttpMethod.POST, signupFn, "SignupIntegration");

    const loginFn = createFn({
      name: "LoginHandler",
      filePath: "packages/server/src/functions/auth/login.ts",
      environment: cognitoEnv,
      tables: [usersTable],
    });
    loginFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["cognito-idp:InitiateAuth"],
        resources: [userPool.userPoolArn],
      })
    );
    addRoute("/auth/login", HttpMethod.POST, loginFn, "LoginIntegration");

    const refreshFn = createFn({
      name: "TokenRefreshHandler",
      filePath: "packages/server/src/functions/auth/refresh.ts",
      environment: { USER_POOL_CLIENT_ID: userPoolClientId },
      tables: [],
    });
    addRoute(
      "/auth/refresh",
      HttpMethod.POST,
      refreshFn,
      "TokenRefreshIntegration"
    );

    // ── outputs ────────────────────────────────────────────────────────────
    new CfnOutput(this, "ApiUrl", { value: api.url ?? "" });
  }
}
