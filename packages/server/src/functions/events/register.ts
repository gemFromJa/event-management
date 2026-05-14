import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { error, ok } from "../../lib/response";
import { getEvent, getAttendee, registerAttendee } from "../../lib/events/db";
import { buildRegistrationEmail } from "../../lib/events/email";
import { extractUser, requireRole } from "../../lib/auth";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});

const EVENTS_TABLE = process.env.EVENTS_TABLE!;
const ATTENDEES_TABLE = process.env.EVENT_ATTENDEES_TABLE!;
const FROM_EMAIL = process.env.FROM_EMAIL!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const eventId = event.pathParameters?.eventId;
  if (!eventId) return error({ code: 400, error: "eventId is required" });

  let user;
  try {
    user = await extractUser(event, db);
  } catch {
    return error({ code: 401, error: "Unauthorized" });
  }

  const roleError = requireRole(user, "attendee");
  if (roleError) return roleError;

  // check event exists and user isn't already registered
  const [eventItem, existingAttendee] = await Promise.all([
    getEvent(db, EVENTS_TABLE, eventId),
    getAttendee(db, ATTENDEES_TABLE, eventId, user.id),
  ]);

  if (!eventItem) return error({ code: 404, error: "Event not found" });
  if (existingAttendee)
    return error({ code: 409, error: "Already registered for this event" });

  // atomically register attendee + increment count
  try {
    await registerAttendee(db, {
      eventsTable: EVENTS_TABLE,
      attendeesTable: ATTENDEES_TABLE,
      eventId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });
  } catch (err: any) {
    if (err.name === "TransactionCanceledException") {
      const reasons = err.CancellationReasons;
      // reason[0] = attendee Put, reason[1] = event Update
      if (reasons?.[0]?.Code === "ConditionalCheckFailed") {
        return error({ code: 409, error: "Already registered for this event" });
      }
      if (reasons?.[1]?.Code === "ConditionalCheckFailed") {
        return error({ code: 409, error: "This event is fully booked" });
      }
    }
    console.error("Registration transaction error:", err);
    return error({ code: 500, error: "Could not register for this event" });
  }

  // It's fine if this fails
  // user will still be registered
  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [user.email] },
        Message: buildRegistrationEmail(user.name, eventItem as any),
      })
    );
  } catch (err) {
    console.error("Failed to send confirmation email:", err);
  }

  return ok({
    data: { eventId, userId: user.id, registered: true },
    code: 201,
  });
};
