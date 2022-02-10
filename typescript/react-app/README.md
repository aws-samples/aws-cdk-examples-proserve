# React App with basic backend

Creates a simple React note taking app and deploys it to an S3 bucket backed by a Cloudfront distribution. Also deploys a DynamoDB table and an API Gateway with basic read/write endpoints.

This example used [this helpful guide](https://www.freecodecamp.org/news/aws-cdk-v2-three-tier-serverless-application/) heavily in it's creation.

The React app is located inside the `/lib/web` folder

The lambda functions are located inside `/lib/lambda`

The CDK Stack is located in `cdk-react-app.ts`

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## How it works

The files in the `/lib/web` are compiled into a bundle by [Vite](https://vitejs.dev/) which is a lightweight module bundling alternative to Webpack.

The built files are then uploaded to an S3 bucket and a Cloudfront distribution is created that has an Origin Access Identity to the S3 bucket.
- Note: The S3 bucket is **not** configured to be a static website, because it is served through Cloudfront instead.

A DynamoDB table is created and a basic schema is defined for notes, along with an API Gateway and two Lambda functions are configured to trigger from the API Gateway and access the DynamoDB table.

Finally, a `config.json` file is created with the URL of the API gateway and uploaded to the same S3 bucket as the built React files. The React app looks for this config file so it knows what URL to send API requests to. This is not an ideal way of doing things in production/real projects, but it is sufficient to keep this example project self contained and working without any additional steps.

## Develop
 * `npm install` to install all the dependencies.
 * `npm run watch` Opens a development version of the React app that watches for changes.

## Deploy

First, bootstrap your environment.

Then run `npm run deploy` and it will build and deploy everything for you.