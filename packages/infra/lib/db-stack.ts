import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { SSM_PARAMS } from "@event-manager/shared";

export class DbStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.createTable("EventsTable", "events", SSM_PARAMS.db.eventsTable);
    this.createTable("UsersTable", "users", SSM_PARAMS.db.usersTable);
    this.createTable(
      "EventAttendeesTable",
      "eventAttendees",
      SSM_PARAMS.db.attendeesTable
    );
  }

  private createTable(id: string, tableName: string, ssmParam: string) {
    const table = new Table(this, id, {
      partitionKey: { name: "id", type: AttributeType.STRING },
      tableName,
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN, // do this only for dev — in prod, consider RETAIN or SNAPSHOT to avoid data loss
    });

    new StringParameter(this, `${id}NameParameter`, {
      parameterName: ssmParam,
      stringValue: table.tableName,
    });

    return table;
  }
}
