import json

def handler(event, context):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/plain'
        },
        'body': json.dumps({"message": {"itemId": event["pathParameters"]["itemId"], "itemName": "Sample Item 1"}})
    }