import AWS from "aws-sdk";

import { Event, Response } from "../_types";

type AsyncEventHandler = (event: Event) => Promise<Response>;
type PutItemInput = AWS.DynamoDB.DocumentClient.PutItemInput;

const TABLE_NAME = process.env.TABLE_NAME!;
const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: "2012-08-10", 
  region: process.env.AWS_REGION
});

export const handler: AsyncEventHandler = async event => {
  const putParams: PutItemInput = {
    TableName: TABLE_NAME,
    Item: {
      connectionId: event.requestContext.connectionId
    }
  };

  try {
    await ddb.put(putParams).promise();
  } catch (err) {
    return { statusCode: 500, body: "Failed to connect: " + JSON.stringify(err) };
  }

  return { statusCode: 200, body: "Connected." };
};
