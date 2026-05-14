import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { extractUser, requireRole } from "../../lib/auth";
import { ok, error } from "../../lib/response";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EVENTS_TABLE = process.env.EVENTS_TABLE!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let user;
  try {
    user = await extractUser(event, db);
  } catch {
    return error({ code: 401, error: "Unauthorized" });
  }

  const roleError = requireRole(user, "organizer");
  if (roleError) return roleError;

  try {
    const { Items } = await db.send(
      new ScanCommand({
        TableName: EVENTS_TABLE,
        FilterExpression: "organizerId = :oid",
        ExpressionAttributeValues: { ":oid": user.id },
      })
    );

    return ok({ data: Items ?? [], code: 200 });
  } catch (err) {
    console.error("Failed to fetch organizer events:", err);
    return error({ code: 500, error: "Failed to fetch your events" });
  }
};
