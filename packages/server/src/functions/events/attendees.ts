import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { extractUser, requireRole } from "../../lib/auth";
import { ok, error } from "../../lib/response";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EVENTS_TABLE = process.env.EVENTS_TABLE!;
const ATTENDEES_TABLE = process.env.EVENT_ATTENDEES_TABLE!;

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

  const eventId = event.pathParameters?.id;
  if (!eventId) return error({ code: 400, error: "eventId is required" });

  // RLS — verify event exists and belongs to this organizer
  try {
    const { Item } = await db.send(
      new GetCommand({
        TableName: EVENTS_TABLE,
        Key: { id: eventId }, // TODO: do a composite key, avoid the lookup
      })
    );

    if (!Item) return error({ code: 404, error: "Event not found" });
    if (Item.organizerId !== user.id)
      return error({ code: 403, error: "Insufficient permissions" });
  } catch (err) {
    console.error("Failed to verify event ownership:", err);
    return error({ code: 500, error: "Failed to fetch registrations" });
  }

  try {
    const { Items } = await db.send(
      new ScanCommand({
        TableName: ATTENDEES_TABLE,
        FilterExpression: "eventId = :eid",
        ExpressionAttributeValues: { ":eid": eventId },
      })
    );

    return ok({ data: Items ?? [], code: 200 });
  } catch (err) {
    console.error("Failed to fetch registrations:", err);
    return error({ code: 500, error: "Failed to fetch registrations" });
  }
};
