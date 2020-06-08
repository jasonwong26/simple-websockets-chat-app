import AWS from "aws-sdk";

import { Event, Response } from "../_types";

interface Input {
  endPoint: string,
  connectionId: string,
  action: string
}
type AsyncEventHandler = (event: Event) => Promise<Response>;
type DeleteItemInput = AWS.DynamoDB.DocumentClient.DeleteItemInput;
type QueryInput = AWS.DynamoDB.DocumentClient.QueryInput;
type QueryOutput = AWS.DynamoDB.DocumentClient.QueryOutput;
type AttributeMap = AWS.DynamoDB.DocumentClient.AttributeMap;

const CONTENT_TABLE_NAME = process.env.CONTENT_TABLE_NAME!;
const AWS_REGION = process.env.AWS_REGION!;

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: "2012-08-10", 
  region: AWS_REGION
});

// The $disconnect route is executed after the connection is closed.
// The connection can be closed by the server or by the client. As the connection is already closed when it is executed, 
// $disconnect is a best-effort event. 

export const handler: AsyncEventHandler = async event => {
  console.log("disconnecting", { event });

  try {
    const input = mapToInput(event);
    await deleteFromContentTable(input);
  } catch (err) {
    console.log("Fatal error", { error: err });
    return { statusCode: 500, body: "Failed to disconnect:  " + JSON.stringify(err) };
  }

  return { statusCode: 200, body: "Disconnected." };
};
const mapToInput = (event: Event) => {
  const { connectionId, domainName, stage } = event.requestContext;
  const endPoint = `${domainName}/${stage}`;

  const input: Input = { action: "disconnect", connectionId, endPoint };
  return input;
};
const deleteFromContentTable: (input: Input) => Promise<void> = async input => {
  const connections = await fetchAllConnections(input);
  const deleteCalls = deleteAllConnections(connections);
  await Promise.all(deleteCalls);
};
const fetchAllConnections: (input: Input) => Promise<QueryOutput> = async input => {
  const indexName = "ByType"; // TODO: decide whether to make this an environment variable?
  const type = "Connection";
  const queryParams: QueryInput = {
    TableName: CONTENT_TABLE_NAME,
    IndexName: indexName,
    KeyConditionExpression: "#type = :type AND #typeSk = :typeSk",
    ExpressionAttributeNames: {
      "#type": "type",
      "#typeSk": "typeSk"
    },
    ExpressionAttributeValues: {
      ":type": type,
      ":typeSk": input.connectionId
    }
  };

  return await ddb.query(queryParams).promise();
};
const deleteAllConnections = (connections: QueryOutput) => {
  if(!connections?.Items) return [];

  return connections.Items.map(async item => {
    await deleteConnectionFromDb(item);
  });  
};
const deleteConnectionFromDb = async (item: AttributeMap) => {
  const keys = {
    pk: item.pk,
    sk: item.sk
  };
  const deleteParams: DeleteItemInput = {
    TableName: CONTENT_TABLE_NAME, 
    Key: keys
  };
  await ddb.delete(deleteParams).promise();
};
