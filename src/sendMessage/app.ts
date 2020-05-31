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
type AsyncEventHandler = (event: Event) => Promise<Output>;
type ScanInput = AWS.DynamoDB.DocumentClient.ScanInput;
type ScanOutput = AWS.DynamoDB.DocumentClient.ScanOutput;
type DeleteItemInput = AWS.DynamoDB.DocumentClient.DeleteItemInput;
type PostToConnectionRequest = AWS.ApiGatewayManagementApi.PostToConnectionRequest;

const TABLE_NAME = process.env.TABLE_NAME!;
const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: "2012-08-10", 
  region: process.env.AWS_REGION
});

export const handler: AsyncEventHandler = async event => {
  let connections: ScanOutput;
  try {
    connections = await getFromDb();
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
const getFromDb = async () => {
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
        await deleteFromDb(connectionId);
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
const deleteFromDb = async (connectionId: string) => {
  const deleteParams: DeleteItemInput = {
    TableName: TABLE_NAME, 
    Key: { connectionId }
  };
  await ddb.delete(deleteParams).promise();
};
