export interface Event {
  isBase64Encoded: boolean
  requestContext: {
    apiId: string
    connectionId: string,
    domainName: string,
    routeKey: string,
    messageId: string | null,
    eventType: string,
    extendedRequestId: string,
    requestTime: string,
    messageDirection: string,
    stage: string,
    connectedAt: number,
    requestTimeEpoch: number,
    requestId: string,
  }
}
export interface ConnectEvent extends Event {
  queryStringParameters?: {
    [key: string]: string
  }
}
export interface MessageEvent extends Event {
  body: string,
}

export interface Response {
  statusCode: number 
  body: string 
}