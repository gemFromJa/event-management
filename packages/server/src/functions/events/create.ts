import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "crypto";
import { CreateEventSchema } from "@event-manager/shared";
import { error, ok } from "../../lib/response";
import { parseBody } from "../../lib/parse";
import { extractUser, requireRole } from "../../lib/auth";

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

  const { data, error: validationError } = parseBody(
    event.body,
    CreateEventSchema
  );
  if (validationError) return validationError;

  try {
    const date = new Date(data.date);

    const item = {
      id: randomUUID(),
      ...data,
      organizerId: user.id,
      attendeeCount: 0,
      titleLower: data.title.toLowerCase(),
      category: data.category.toLowerCase(),
      date: date.toISOString().split("T")[0],
      time: date.toISOString().split("T")[1].slice(0, 5),
      dateTimestamp: date.getTime(),
      createdAt: new Date().toISOString(),
    };

    await db.send(
      new PutCommand({
        TableName: EVENTS_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)",
      })
    );

    return ok({ data: { eventId: item.id }, code: 201 });
  } catch (err) {
    console.error("Failed to create event:", err);
    return error({ code: 500, error: "Failed to create event" });
  }
};
