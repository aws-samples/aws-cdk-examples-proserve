# React App with basic backend

Creates a simple React note taking app and deploys it to a static S3 bucket backed by a Cloudfront distribution. Also deploys a DynamoDB table and an API Gateway with basic read/write endpoints.

This example used [this helpful guide](https://www.freecodecamp.org/news/aws-cdk-v2-three-tier-serverless-application/) heavily in it's creation.

The React app is located inside the `/lib/web` folder

The CDK Stack is located in `cdk-react-app.ts`

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Develop
 * `npm install` to install all the dependencies.
 * `npm run watch` Opens a development version of the React app that watches for changes.

## Deploy

First, bootstrap your environment.

Then run `npm run deploy` and it will build and deploy everything for you.