import AWS from "aws-sdk";

import { ConnectEvent, Response } from "../_types";

export interface Input {
  endPoint: string,
  connectionId: string,
  action: string,
  channel: string
}
export interface Connection {
  pk: string,
  sk: string,
  type: string,
  typeSk: string,
  channel: string
  connectionId: string
}
type AsyncEventHandler = (event: ConnectEvent) => Promise<Response>;
type PutItemInput = AWS.DynamoDB.DocumentClient.PutItemInput;

const CONTENT_TABLE_NAME = process.env.CONTENT_TABLE_NAME!;
const AWS_REGION = process.env.AWS_REGION!;

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: "2012-08-10", 
  region: AWS_REGION
});

export const handler: AsyncEventHandler = async event => {
  console.log("connecting", { event });

  try {
    const input = mapToInput(event);
    await writeToContentTable(input);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { statusCode: 400, body: "Failed to connect: " + JSON.stringify(err) };
    }
    console.log("Fatal error", { error: err });
    return { statusCode: 500, body: "Failed to connect: " + JSON.stringify(err) };
  }

  return { statusCode: 200, body: "Connected." };
};
export const mapToInput = (event: ConnectEvent) => {
  const { connectionId, domainName, stage } = event.requestContext;
  const endPoint = `${domainName}/${stage}`;

  const channel = event.queryStringParameters?.[`channel`];
  if(!channel) {
    throw new ValidationError("missing required querystring parameter: 'channel'");
  }

  const input: Input = { action: "connect", channel, connectionId, endPoint };
  return input;
};
const writeToContentTable: (input: Input) => Promise<void> = async input => {
  const connection = mapToConnection(input);
  const putParams: PutItemInput = {
    TableName: CONTENT_TABLE_NAME,
    Item: connection
  };
  await ddb.put(putParams).promise();
};
export const mapToConnection = (input: Input) => {
  const { channel, connectionId } = input;
  const connection: Connection = {
    pk: channel ?? "Channel#1",
    sk: `Connection#${connectionId}`,
    type: "Connection",
    typeSk: connectionId,
    channel: channel ?? "Channel#1",
    connectionId
  };

  return connection;
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";

    // Set the prototype explicitly.  Needed for Jest validations, etc.
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
