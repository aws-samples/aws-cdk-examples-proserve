#!/usr/bin/env node
import 'source-map-support/register';
import {App, CfnOutput, CfnParameter, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import {Topic} from "aws-cdk-lib/aws-sns";
import {AccountPrincipal, Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";

class CrossAccountEventingPublisherStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const param = new CfnParameter(this, 'SubscriberAccountId', {
      type: "String",
      description: "The Account Id of the subscriber"
    });

    const topic = new Topic(this, 'PublisherTopic', {});

    const statement = new PolicyStatement({
      actions: ['sns:Subscribe'],
      effect: Effect.ALLOW,
      principals: [new AccountPrincipal(param.valueAsString)],
      resources: [topic.topicArn]
    });

    topic.addToResourcePolicy(statement);

    new CfnOutput(this, 'PublisherTopicArn', {
      value: topic.topicArn
    });
  }
}

const app = new App();
new CrossAccountEventingPublisherStack(app, 'CrossAccountEventingPublisherStack');
