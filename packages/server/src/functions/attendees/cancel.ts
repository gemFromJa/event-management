import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
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

  const eventId = event.pathParameters?.id;
  if (!eventId) return error({ code: 400, error: "eventId is required" });

  const attendeeKey = `${eventId}#${user.id}`;

  // verify registration exists and belongs to this user
  try {
    const { Item } = await db.send(
      new GetCommand({
        TableName: ATTENDEES_TABLE,
        Key: { id: attendeeKey },
      })
    );

    if (!Item) return error({ code: 404, error: "Registration not found" });
    if (Item.userId !== user.id)
      return error({ code: 403, error: "Insufficient permissions" });
  } catch (err) {
    console.error("Failed to fetch registration:", err);
    return error({ code: 500, error: "Failed to cancel registration" });
  }

  // atomically delete registration + decrement attendee count
  try {
    await db.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: ATTENDEES_TABLE,
              Key: { id: attendeeKey },
              ConditionExpression: "attribute_exists(id)",
            },
          },
          {
            Update: {
              TableName: EVENTS_TABLE,
              Key: { id: eventId },
              UpdateExpression: "ADD attendeeCount :dec",
              ConditionExpression: "attendeeCount > :zero",
              ExpressionAttributeValues: { ":dec": -1, ":zero": 0 },
            },
          },
        ],
      })
    );
  } catch (err: any) {
    if (err.name === "TransactionCanceledException") {
      return error({
        code: 409,
        error: "Registration has already been cancelled",
      });
    }
    console.error("Cancel registration error:", err);
    return error({ code: 500, error: "Failed to cancel registration" });
  }

  return ok({ data: { cancelled: true }, code: 200 });
};
