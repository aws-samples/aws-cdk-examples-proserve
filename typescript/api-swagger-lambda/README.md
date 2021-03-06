# APIGateway with Swagger OpenAPI Spec File and Lambda
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

An API Gateway/Lambda Rest API is created in a stack using an OpenAPI definition file to define the API methods. This will include API Gateway request validators and Integration within the definition file. It will eliminate the need to define the API methods in the stack file. Example code is available in Typescript. This solution provides sample code to the user that sets up a basic Lambda function, defines the OpenAPI definition file as an Asset API Definition an adds this definition to an API Gateway Instance.

## Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, then the lambda functions' dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.

## The Component Structure

The whole component contains:

- An API Gateway with method specified in the `swagger/swagger.yaml` file.
- A Lambda function in `lambda/index.ts` which return an example item.
- Integrations and validation happen in the Swagger file.

## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

After building the TypeScript code, the following CDK toolkit commands can be ran:

```bash
    $ cdk ls
    <list all stacks related to this example>

    $ cdk synth
    <generates and outputs cloudformation template>

    $ cdk deploy
    <deploys stack to your account>

    $ cdk diff
    <shows diff against deployed stack>
```