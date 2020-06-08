import AWS from "aws-sdk";

import { MessageEvent, Response } from "../_types";

interface Request {
  message: string,
  channel: string,
  data: string
}
interface Input {
  endPoint: string,
  connectionId: string,
  action: string,
  channel: string,
  message: string
}
interface ChatLog {
  pk: string,
  sk: string,
  log: ChatEntry[]
}
interface ChatEntry {
  connectionId: string,
  message: string
}
type AsyncEventHandler = (event: MessageEvent) => Promise<Response>;
type QueryInput = AWS.DynamoDB.DocumentClient.QueryInput;
type QueryOutput = AWS.DynamoDB.DocumentClient.QueryOutput;

type GetItemInput = AWS.DynamoDB.DocumentClient.GetItemInput;
type PutItemInput = AWS.DynamoDB.DocumentClient.PutItemInput;

type DeleteItemInput = AWS.DynamoDB.DocumentClient.DeleteItemInput;
type PostToConnectionRequest = AWS.ApiGatewayManagementApi.PostToConnectionRequest;

const TABLE_NAME = process.env.TABLE_NAME!;
const CONTENT_TABLE_NAME = process.env.CONTENT_TABLE_NAME!;
const AWS_REGION = process.env.AWS_REGION!;

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: "2012-08-10", 
  region: AWS_REGION
});

export const handler: AsyncEventHandler = async event => {
  console.log("sending message", { event });

  try {
    const input = mapToInput(event);
    await writeToContentLog(input);
    await pushToAllListeners(input);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { statusCode: 400, body: "Failed to send: " + JSON.stringify(err) };
    }
    console.log("Fatal error", { error: err });
    return { statusCode: 500, body: err.stack };
  }

  return { statusCode: 200, body: "Data sent." };
};
const mapToInput = (event: MessageEvent) => {
  if(!event.body) {
    throw new ValidationError("missing required request body");
  }
  const request: Request = JSON.parse(event.body);
  const { connectionId, domainName, stage } = event.requestContext;
  const endPoint = `${domainName}/${stage}`;
  const input: Input = { action: request.message, channel: request.channel, message: request.data, connectionId, endPoint };
  return input;
};

const writeToContentLog = async (input: Input) => {
  const chatLog = await getOrCreateLog(input);
  const { connectionId, message } = input;
  const chatEntry: ChatEntry = { connectionId, message };
  chatLog.log.push(chatEntry);
  await saveLogToDb(chatLog);
};
const getOrCreateLog: (input: Input) => Promise<ChatLog> = async input => {
  const { channel } = input;
  const keys = {
    pk: channel ?? "Channel#1",
    sk: getContentSk(),    
  };
  const getParams: GetItemInput = { 
    TableName: CONTENT_TABLE_NAME, 
    Key: keys
  };  
  
  const dbLog = await ddb.get(getParams).promise();
  if(!dbLog.Item) {
    return {...keys, log: [] };
  }

  return dbLog.Item as ChatLog;
};
const saveLogToDb = async (log: ChatLog) => {
  const putParams: PutItemInput = { 
    TableName: CONTENT_TABLE_NAME, 
    Item: log
  }; 
  
  await ddb.put(putParams).promise();
};

const pushToAllListeners: (input: Input) => Promise<void> = async input => {
  const connections = await fetchAllConnections(input);
  const pushCalls = pushToAllConnections(connections, input);
  await Promise.all(pushCalls);
};
const fetchAllConnections: (input: Input) => Promise<QueryOutput> = async input => {
  const queryParams: QueryInput = {
    TableName: CONTENT_TABLE_NAME,
    KeyConditionExpression: "#pk = :pk AND #sk BETWEEN :sk1 AND :sk2",
    ExpressionAttributeNames: {
      "#pk": "pk",
      "#sk": "sk"
    },
    ExpressionAttributeValues: {
      ":pk": input.channel,
      ":sk1": "Connection#",
      ":sk2": "Connection$"
    }
  };

  return await ddb.query(queryParams).promise();
};
const pushToAllConnections = (connections: QueryOutput, input: Input) => {
  if(!connections?.Items) return [];

  const api = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: input.endPoint
  });
  return connections.Items.map(async ({ connectionId }) => {
    try {
      await pushToConnection(api, input);
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting connection: ${connectionId}`);
        await deleteConnectionFromDb(connectionId);
      } else {
        throw e;
      }
    }
  });  
};

const pushToConnection = async (api: AWS.ApiGatewayManagementApi, input: Input) => {
  const postRequest: PostToConnectionRequest = {
    ConnectionId: input.connectionId, 
    Data: input.message
  };
  await api.postToConnection(postRequest).promise();
};
const deleteConnectionFromDb = async (connectionId: string) => {
  const deleteParams: DeleteItemInput = {
    TableName: TABLE_NAME, 
    Key: { connectionId }
  };
  await ddb.delete(deleteParams).promise();
};

export const getContentSk = (date: Date = new Date()) => {
  const timezoneOffset = date.getMinutes() + date.getTimezoneOffset();
  const timestamp = date.getTime() + timezoneOffset * 1000;
  const correctDate = new Date(timestamp);  
  correctDate.setUTCHours(0, 0, 0, 0);

  return `ChatLog#${correctDate.toISOString()}`;
};

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
