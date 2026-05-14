import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SearchEventsSchema } from "@event-manager/shared";
import { parseBody } from "../../lib/parse";
import { error } from "../../lib/response";
import { buildQuery } from "../../lib/events/search";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EVENTS_TABLE = process.env.EVENTS_TABLE!;
const PAGE_SIZE = 16;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { data, error: validationError } = parseBody(
    event.queryStringParameters
      ? JSON.stringify(event.queryStringParameters)
      : null,
    SearchEventsSchema
  );
  if (validationError) return validationError;

  const exclusiveStartKey = data.cursor
    ? JSON.parse(Buffer.from(data.cursor, "base64").toString("utf-8"))
    : undefined;

  const { query, attributes } = buildQuery(data);
  const filterParams = query
    ? {
        FilterExpression: query,
        ExpressionAttributeValues: attributes,
        ExpressionAttributeNames: {
          "#dt": "date",
        },
      }
    : {};

  try {
    const { Items, LastEvaluatedKey } = await db.send(
      new ScanCommand({
        TableName: EVENTS_TABLE,
        ExclusiveStartKey: exclusiveStartKey,
        Limit: PAGE_SIZE,
        ...filterParams,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        items: Items ?? [],
        cursor: LastEvaluatedKey
          ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString("base64")
          : null,
      }),
    };
  } catch (err) {
    console.error("DynamoDB scan error:", err);
    return error({ code: 500, error: "Failed to fetch events" });
  }
};
