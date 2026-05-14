export const CATEGORIES = ["premiere", "event", "convention", "party"];

export const SSM_PARAMS = {
  db: {
    eventsTable: "/event-manager/db/eventsTable",
    attendeesTable: "/event-manager/db/attendeesTable",
    usersTable: "/event-manager/db/usersTable",
  },
  auth: {
    userPoolId: "/event-manager/auth/userPoolId",
    clientId: "/event-manager/auth/clientId",
    userPoolArn: "/event-manager/auth/userPoolArn",
    userPoolClientId: "/event-manager/auth/userPoolClientId",
  },
  frontend: {
    url: "/event-manager/frontend/url",
  },
};
