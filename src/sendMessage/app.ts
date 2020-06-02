import AWS from "aws-sdk";

interface Event {
  body: string
  requestContext: {
    connectionId: string
    domainName: string
    stage: string
  }
}
interface Output {
  statusCode: number 
  body: string 
}

interface ChatKeys {
  pk: string,
  sk: string,
}
interface ChatLog extends ChatKeys {
  log: ChatLogEntry[]
}
interface ChatLogEntry {
  connectionId: string,
  message: string
}
type AsyncEventHandler = (event: Event) => Promise<Output>;
type ScanInput = AWS.DynamoDB.DocumentClient.ScanInput;
type ScanOutput = AWS.DynamoDB.DocumentClient.ScanOutput;
type GetItemInput = AWS.DynamoDB.DocumentClient.GetItemInput;
type PutItemInput = AWS.DynamoDB.DocumentClient.PutItemInput;

type DeleteItemInput = AWS.DynamoDB.DocumentClient.DeleteItemInput;
type PostToConnectionRequest = AWS.ApiGatewayManagementApi.PostToConnectionRequest;

const TABLE_NAME = process.env.TABLE_NAME!;
const CONTENT_TABLE_NAME = process.env.CONTENT_TABLE_NAME!;
const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: "2012-08-10", 
  region: process.env.AWS_REGION
});

export const handler: AsyncEventHandler = async event => {
  let connections: ScanOutput;
  try {
    await writeToContentLog(event);
    connections = await getConnectionsFromDb();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  const postCalls = pushToAllConnections(connections, event);
  try {
      await Promise.all(postCalls);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: "Data sent." };
};
const writeToContentLog = async (event: Event) => {
  console.log(`logging event to ${CONTENT_TABLE_NAME} table`, event);
  const chatLog = await getOrCreateLog();
  const chatEntry = mapToLogEntry(event);
  chatLog.log.push(chatEntry);
  await saveLogToDb(chatLog);
}
const getOrCreateLog: () => Promise<ChatLog> = async () => {
  const keys = {
    pk: "Channel#1",
    sk: getContentSk()
  };
  const getParams: GetItemInput = { 
    TableName: CONTENT_TABLE_NAME, 
    Key: keys
  };  
  
  const dbLog = await ddb.get(getParams).promise();
  if(!dbLog.Item) 
    return {...keys, log: [] };

  return dbLog.Item as ChatLog;
}
const saveLogToDb = async (log: ChatLog) => {
  const putParams: PutItemInput = { 
    TableName: CONTENT_TABLE_NAME, 
    Item: log
  }; 
  
  await ddb.put(putParams).promise();
}

const getConnectionsFromDb = async () => {
  const scanParams: ScanInput = { 
    TableName: TABLE_NAME!, 
    ProjectionExpression: "connectionId" 
  };
  const connectionData = await ddb.scan(scanParams).promise();

  return connectionData;
};
const pushToAllConnections = (connections: ScanOutput, event: Event) => {
  if(!connections?.Items) return [];

  const api = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
  });
  const message = JSON.parse(event.body).data;

  return connections.Items.map(async ({ connectionId }) => {
    try {
      await pushToConnection(api, connectionId, message);
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
const pushToConnection = async (api: AWS.ApiGatewayManagementApi, connectionId: string, message: string) => {
  const postRequest: PostToConnectionRequest = {
    ConnectionId: connectionId, 
    Data: message
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

export const mapToLogEntry = (event: Event) => {
  const connectionId = event.requestContext.connectionId;
  const message = JSON.parse(event.body).data;
  const log: ChatLogEntry = { 
    connectionId, 
    message 
  };

  return log;
}
export const getContentSk = (date: Date = new Date()) => {
  var timezoneOffset = date.getMinutes() + date.getTimezoneOffset();
  var timestamp = date.getTime() + timezoneOffset * 1000;
  var correctDate = new Date(timestamp);
  
  correctDate.setUTCHours(0, 0, 0, 0);
  return `ChatLog#${correctDate.toISOString()}`;
}