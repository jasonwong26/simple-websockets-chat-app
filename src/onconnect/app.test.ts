import { ConnectEvent } from "../_types";
import { Input, mapToInput, ValidationError, Connection, mapToConnection } from "./app";

describe("mapToInput", () => {
  it("works for normal case", () => {
    const input: ConnectEvent = {
      requestContext: {
        routeKey: "$connect",
        messageId: null,
        eventType: "CONNECT",
        extendedRequestId: "NlrESE91vHcFXDg=",
        requestTime: "04/Jun/2020:05:50:44 +0000",
        messageDirection: "IN",
        stage: "Prod",
        connectedAt: 1591249844900,
        requestTimeEpoch: 1591249844902,
        requestId: "NlrESE91vHcFXDg=",
        domainName: "8yhgex0kz2.execute-api.us-west-2.amazonaws.com",
        connectionId: "NlrEScxHPHcCFug=",
        apiId: "8yhgex0kz2"
      },
      isBase64Encoded: false,
      queryStringParameters: { channel: "test_channel" }
    };
    const output: Input = mapToInput(input);
    
    const expected = {
      action: "connect", 
      channel: input.queryStringParameters?.channel!, 
      connectionId: "NlrEScxHPHcCFug=", 
      endPoint: "8yhgex0kz2.execute-api.us-west-2.amazonaws.com/Prod"
    };
    expect(output).toEqual(expected);
  });
  it("throws error on invalid input 1", () => {
    const input: ConnectEvent = {
      requestContext: {
        routeKey: "$connect",
        messageId: null,
        eventType: "CONNECT",
        extendedRequestId: "NlrESE91vHcFXDg=",
        requestTime: "04/Jun/2020:05:50:44 +0000",
        messageDirection: "IN",
        stage: "Prod",
        connectedAt: 1591249844900,
        requestTimeEpoch: 1591249844902,
        requestId: "NlrESE91vHcFXDg=",
        domainName: "8yhgex0kz2.execute-api.us-west-2.amazonaws.com",
        connectionId: "NlrEScxHPHcCFug=",
        apiId: "8yhgex0kz2"
      },
      isBase64Encoded: false
    };
    expect(() => {
      mapToInput(input);
    }).toThrow(ValidationError);
  });
  it("throws error on invalid input 2", () => {
    const input: ConnectEvent = {
      requestContext: {
        routeKey: "$connect",
        messageId: null,
        eventType: "CONNECT",
        extendedRequestId: "NlrESE91vHcFXDg=",
        requestTime: "04/Jun/2020:05:50:44 +0000",
        messageDirection: "IN",
        stage: "Prod",
        connectedAt: 1591249844900,
        requestTimeEpoch: 1591249844902,
        requestId: "NlrESE91vHcFXDg=",
        domainName: "8yhgex0kz2.execute-api.us-west-2.amazonaws.com",
        connectionId: "NlrEScxHPHcCFug=",
        apiId: "8yhgex0kz2"
      },
      isBase64Encoded: false,
      queryStringParameters: { channel: "" }
    };
    expect(() => {
      mapToInput(input);
    }).toThrow(ValidationError);
  });
});

describe("mapToConnection", () => {
  it("works for normal case", () => {
    const input: Input = {
      action: "connect", 
      channel: "channel#2", 
      connectionId: "NlrEScxHPHcCFug=", 
      endPoint: "8yhgex0kz2.execute-api.us-west-2.amazonaws.com/Prod"
    };

    const output = mapToConnection(input);

    const expected: Connection = {
      pk: input.channel,
      sk: `Connection#${input.connectionId}`,
      type: "Connection",
      typeSk: input.connectionId,
      channel: input.channel,
      connectionId: input.connectionId
    };
    expect(output).toEqual(expected);
  });
});