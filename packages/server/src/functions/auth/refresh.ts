import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
} from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { parseBody } from "../../lib/parse";
import { ok, error } from "../../lib/response";
import { z } from "zod";

const cognito = new CognitoIdentityProviderClient({});
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { data, error: validationError } = parseBody(event.body, RefreshSchema);
  if (validationError) return validationError;

  try {
    const res = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: data.refreshToken,
        },
      })
    );

    const tokens = res.AuthenticationResult;
    if (!tokens) return error({ code: 401, error: "Token refresh failed" });

    return ok({
      data: {
        accessToken: tokens.AccessToken,
        idToken: tokens.IdToken,
        // Cognito does not return a new refresh token on refresh
        // client keeps the existing one
      },
      code: 200,
    });
  } catch (err: any) {
    if (err instanceof NotAuthorizedException) {
      return error({ code: 401, error: "Refresh token expired" });
    }
    console.error("Token refresh error:", err);
    return error({ code: 500, error: "Failed to refresh token" });
  }
};
