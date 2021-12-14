import { Handler, APIGatewayEvent } from "aws-lambda";

export const handler: Handler = async(event: APIGatewayEvent): Promise<any> => {
  console.log(event);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({"message": {"itemId": event.pathParameters?.itemId, "itemName": "Sample Item 1"}})
  };
};