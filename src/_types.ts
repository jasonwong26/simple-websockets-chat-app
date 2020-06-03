export interface Event {
  isBase64Encoded: boolean
  body: string,
  requestContext: {
    apiId: string
    connectionId: string,
    domainName: string,
    routeKey: string,
    messageId: string,
    eventType: string,
    extendedRequestId: string,
    requestTime: string,
    messageDirection: string,
    stage: string,
    connectedAt: number,
    requestTimeEpoch: number,
    requestId: string,
  },
}

export interface Response {
  statusCode: number 
  body: string 
}