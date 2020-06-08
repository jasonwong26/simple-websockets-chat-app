import AWS from "aws-sdk";

type QueryInput = AWS.DynamoDB.DocumentClient.QueryInput;

describe.skip("query index tests", () => {
  const CONTENT_TABLE_NAME = "simplechat_connections_content";
  const INDEX_NAME = "ByType";
  const AWS_REGION = "us-west-2";

  const ddb = new AWS.DynamoDB.DocumentClient({
    apiVersion: "2012-08-10", 
    region: AWS_REGION
  });

  it("works for normal case", async () => {
    const type = "Connection";
    const connectionId = "mockConnection";
    const queryParams: QueryInput = {
      TableName: CONTENT_TABLE_NAME,
      IndexName: INDEX_NAME,
      KeyConditionExpression: "#type = :type AND #typeSk = :typeSk",
      ExpressionAttributeNames: {
        "#type": "type",
        "#typeSk": "typeSk"
      },
      ExpressionAttributeValues: {
        ":type": type,
        ":typeSk": connectionId
      }
    };

    const results = await ddb.query(queryParams).promise();
    const output = results.Items ?? [];

    expect(output.length).toBe(2);
    console.log("results returned:", output);
  });
});