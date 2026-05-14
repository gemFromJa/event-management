import {
  DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

export const getEvent = (
  db: DynamoDBDocumentClient,
  tableName: string,
  id: string
) =>
  db
    .send(new GetCommand({ TableName: tableName, Key: { id } }))
    .then((r) => r.Item ?? null);

export const getAttendee = (
  db: DynamoDBDocumentClient,
  tableName: string,
  eventId: string,
  userId: string
) =>
  db
    .send(
      new GetCommand({
        TableName: tableName,
        Key: { id: `${eventId}#${userId}` },
      })
    )
    .then((r) => r.Item ?? null);

export const registerAttendee = (
  db: DynamoDBDocumentClient,
  {
    eventsTable,
    attendeesTable,
    eventId,
    userId,
    userEmail,
    userName,
  }: {
    eventsTable: string;
    attendeesTable: string;
    eventId: string;
    userId: string;
    userEmail: string;
    userName: string;
  }
) =>
  db.send(
    new TransactWriteCommand({
      TransactItems: [
        // 1. add attendee — fails if already registered
        {
          Put: {
            TableName: attendeesTable,
            Item: {
              id: `${eventId}#${userId}`,
              eventId,
              userId,
              userEmail,
              userName,
              registeredAt: new Date().toISOString(),
            },
            ConditionExpression: "attribute_not_exists(id)",
          },
        },
        // 2. increment count — fails if at capacity
        {
          Update: {
            TableName: eventsTable,
            Key: { id: eventId },
            UpdateExpression: "ADD attendeeCount :inc",
            ConditionExpression:
              "attribute_not_exists(maxCapacity) OR attendeeCount < maxCapacity",
            ExpressionAttributeValues: { ":inc": 1 },
          },
        },
      ],
    })
  );
