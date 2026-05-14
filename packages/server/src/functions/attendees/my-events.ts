import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { extractUser, requireRole } from "../../lib/auth";
import { ok, error } from "../../lib/response";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ATTENDEES_TABLE = process.env.EVENT_ATTENDEES_TABLE!;
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

  const roleError = requireRole(user, "attendee");
  if (roleError) return roleError;

  let registrations;
  try {
    // TODO: pagination would be necessary but don't have time
    const res = await db.send(
      new ScanCommand({
        TableName: ATTENDEES_TABLE,
        FilterExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": user.id },
      })
    );
    registrations = res.Items ?? [];
  } catch (err) {
    console.error("Failed to fetch registrations:", err);
    return error({ code: 500, error: "Failed to fetch your registrations" });
  }
  if (registrations.length === 0) return ok({ data: [], code: 200 });

  try {
    const keys = registrations.map((r) => ({ id: r.eventId }));
    const res = await db.send(
      new BatchGetCommand({
        RequestItems: {
          [EVENTS_TABLE]: { Keys: keys },
        },
      })
    );

    const registeredEvents = res.Responses?.[EVENTS_TABLE] ?? [];
    return ok({ data: registeredEvents, code: 200 });
  } catch (err) {
    console.error("Failed to fetch event details:", err);
    return error({ code: 500, error: "Failed to fetch event details" });
  }
};
