# Cross-Account Eventing with CDK

Two business systems need to be able to communicate using an event-driven pattern. The systems are hosted in separate AWS accounts. This example would use a combination of an SNS topic in Account A with an SQS queue in Account B. A resource policy will prevent any other source from publishing into the SQS queue.

![diagram](https://user-images.githubusercontent.com/737853/149157898-50792b34-e007-4841-bcce-100a5462ce2f.jpg)


When deploying this pattern be sure to adjust the publisher policy to align with appropriate access for your own environments.

## Walk-through

### 0. Install dependencies

```shell
npm install -g aws-cdk # you may skip this step if you already have the CDK CLI installed
cd typescript/cross-account-eventing # assumes you are in the repository root directory
npm install
```

### 1. Create the Publisher Infrastructure

```shell
cd publisher
# Login to Account A with the AWS CLI
cdk bootstrap # you may skip this step if `cdk bootstrap` has already been run in this account
cdk deploy --parameters SubscriberAccountId=REPLACE_WITH_SUBSCRIBER_ACCOUNT_ID
# Make note of the output value 'CrossAccountEventingPublisherStack.PublisherTopicArn'
```

### 2. Create the Subscriber Infrastructure

```shell
cd ../subscriber # assumes you are still in the publisher directory from step 1
# Login to Account B with the AWS CLI
cdk bootstrap # you may skip this step if `cdk bootstrap` has already been run in this account
cdk deploy --parameters PublisherTopicArn=REPLACE_WITH_OUTPUT_VALUE_FROM_STEP_1
```

### 3. Test the setup

Utilize the guides below to complete the following steps within the AWS Management Console

1. Login to Account A
2. Go to your newly created SNS Topic
3. Create and publish a message
4. Login to Account B
5. Go to your newly created SQS Queue
6. Run the steps to receive and view the message

* AWS Developer Guide
  * [Message publishing](https://docs.aws.amazon.com/sns/latest/dg/sns-publishing.html#sns-publishing-messages) on SNS Topics
  * [Receiving and deleting a message](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-using-receive-delete-message.html) on SQS Queues
