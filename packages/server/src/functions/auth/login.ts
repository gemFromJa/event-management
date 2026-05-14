import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
  PasswordResetRequiredException,
  UserNotFoundException,
  UserNotConfirmedException,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ok, error } from "../../lib/response";
import { parseBody } from "../../lib/parse";
import { LoginSchema } from "@event-manager/shared";

const cognito = new CognitoIdentityProviderClient({});
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const USERS_TABLE = process.env.USERS_TABLE!;

const extractSub = (accessToken: string): string =>
  JSON.parse(Buffer.from(accessToken.split(".")[1], "base64").toString()).sub;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { data, error: validationError } = parseBody(event.body, LoginSchema);
  if (validationError) return validationError;

  const { email, password } = data;

  try {
    const res = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );

    const tokens = res.AuthenticationResult;
    if (!tokens?.AccessToken)
      return error({ code: 401, error: "Authentication failed" });

    const { Item } = await db.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { id: extractSub(tokens.AccessToken) },
      })
    );

    return ok({
      data: {
        accessToken: tokens.AccessToken,
        idToken: tokens.IdToken,
        refreshToken: tokens.RefreshToken,
        role: Item?.role ?? "attendee",
        name: Item?.name ?? "",
      },
      code: 200,
    });
  } catch (err) {
    if (
      err instanceof NotAuthorizedException ||
      err instanceof UserNotFoundException
    ) {
      return error({ code: 401, error: "Invalid email or password" });
    }
    if (err instanceof UserNotConfirmedException) {
      return error({ code: 403, error: "Account not confirmed" });
    }
    if (err instanceof PasswordResetRequiredException) {
      return error({ code: 403, error: "Password reset required" });
    }
    console.error("Login error:", err);
    return error({ code: 500, error: "Login failed. Please try again." });
  }
};
