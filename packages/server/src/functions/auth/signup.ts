import {
  AdminConfirmSignUpCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  InvalidParameterException,
  InvalidPasswordException,
  SignUpCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "crypto";
import { z } from "zod";
import { error, ok } from "../../lib/response";
import { parseBody } from "../../lib/parse";

const cognito = new CognitoIdentityProviderClient({});
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const USERS_TABLE = process.env.USERS_TABLE!;

const SignupSchema = z.object({
  role: z.enum(["attendee", "organizer"]),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const rollbackCognitoUser = async (email: string) => {
  try {
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      })
    );
  } catch (err) {
    // CRITICAL: user exists in Cognito but not DynamoDB — needs manual cleanup
    console.error("CRITICAL: Cognito rollback failed for:", email, err);
  }
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { data, error: validationError } = parseBody(event.body, SignupSchema);
  if (validationError) return validationError;

  const { email, password, name, role } = data;

  // step 1 — create in Cognito
  let cognitoUser;
  try {
    cognitoUser = await cognito.send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "name", Value: name },
          { Name: "custom:role", Value: role },
        ],
      })
    );
  } catch (err) {
    if (err instanceof UsernameExistsException) {
      return error({
        code: 409,
        error: "An account with this email already exists",
      });
    }
    if (err instanceof InvalidPasswordException) {
      return error({ code: 400, error: "Password does not meet requirements" });
    }
    if (err instanceof InvalidParameterException) {
      return error({ code: 400, error: "Invalid signup details" });
    }
    console.error("Cognito signup error:", err);
    return error({ code: 500, error: "Failed to create account" });
  }

  // step 2 — auto confirm acc
  try {
    await cognito.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      })
    );
  } catch (err) {
    console.error("Cognito confirm error:", err);
    await rollbackCognitoUser(email);
    return error({ code: 500, error: "Failed to confirm account" });
  }

  // step 3 — create in DynamoDB
  // Cognito handles auth, DynamoDB stores app data (role, profile etc)
  try {
    await db.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          id: cognitoUser.UserSub ?? randomUUID(),
          email,
          name,
          role,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(id)",
      })
    );
  } catch (err) {
    console.error("DynamoDB user creation error:", err);
    await rollbackCognitoUser(email);
    return error({ code: 500, error: "Failed to complete registration" });
  }

  return ok({ data: { message: "Account created successfully" }, code: 201 });
};
