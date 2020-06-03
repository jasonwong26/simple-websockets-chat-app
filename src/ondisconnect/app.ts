import AWS from "aws-sdk";

import { Event, Response } from "../_types";

type AsyncEventHandler = (event: Event) => Promise<Response>;
type DeleteItemInput = AWS.DynamoDB.DocumentClient.DeleteItemInput;

const TABLE_NAME = process.env.TABLE_NAME!;
const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: "2012-08-10", 
  region: process.env.AWS_REGION
});

// The $disconnect route is executed after the connection is closed.
// The connection can be closed by the server or by the client. As the connection is already closed when it is executed, 
// $disconnect is a best-effort event. 

export const handler: AsyncEventHandler = async event => {
  const deleteParams: DeleteItemInput = {
    TableName: TABLE_NAME,
    Key: {
      connectionId: event.requestContext.connectionId
    }
  };

  try {
    await ddb.delete(deleteParams).promise();
  } catch (err) {
    return { statusCode: 500, body: "Failed to disconnect:  " + JSON.stringify(err) };
  }

  return { statusCode: 200, body: "Disconnected." };
};
