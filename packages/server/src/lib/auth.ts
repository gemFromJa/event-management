import { APIGatewayProxyEvent } from "aws-lambda";
import { error } from "./response";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "organizer" | "attendee";
}

export const extractUser = async (
  event: APIGatewayProxyEvent,
  db: DynamoDBDocumentClient
): Promise<AuthUser> => {
  const claims = (event.requestContext as any).authorizer?.jwt?.claims;
  if (!claims?.sub) throw new Error("Unauthorized");

  // sub is always in access token — use it to fetch user from DB
  const { Items } = await db.send(
    new ScanCommand({
      TableName: process.env.USERS_TABLE!,
      FilterExpression: "id = :sub",
      ExpressionAttributeValues: { ":sub": claims.sub },
    })
  );

  const user = Items?.[0];
  if (!user) throw new Error("User not found");

  return {
    id: claims.sub,
    email: user.email,
    name: user.name ?? claims.email,
    role: user.role ?? "attendee",
  };
};

export const requireRole = (user: AuthUser, role: "organizer" | "attendee") => {
  if (user.role !== role) {
    return error({ code: 403, error: "Insufficient permissions" });
  }
  return null;
};
