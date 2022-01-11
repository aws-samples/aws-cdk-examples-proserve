#!/usr/bin/env node
import 'source-map-support/register';
import {App, CfnParameter, Duration, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import {Subscription, SubscriptionProtocol, Topic} from "aws-cdk-lib/aws-sns";
import {Effect, PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {Queue} from "aws-cdk-lib/aws-sqs";

class CrossAccountEventingSubscriberStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const param = new CfnParameter(this,'PublisherTopicArn', {
            type: "String",
            description: "The SNS Topic ARN of the publisher"
        })

        const topic = Topic.fromTopicArn(this, 'SubscriberExternalTopic', param.valueAsString);

        const dlq = new Queue(this, 'SubscriberDeadLetterQueue', {
            retentionPeriod: Duration.days(14)
        })

        const queue = new Queue(this, 'SubscriberQueue', {
            deadLetterQueue: {
                queue: dlq,
                maxReceiveCount: 3
            },
            retentionPeriod: Duration.days(7)
        });

        const statement = new PolicyStatement({
            actions: ['sqs:SendMessage'],
            effect: Effect.ALLOW,
            principals: [new ServicePrincipal('sns.amazonaws.com')],
            resources: [queue.queueArn]
        });
        statement.addCondition('ArnEquals', {
            'aws:SourceArn': topic.topicArn,
        });

        queue.addToResourcePolicy(statement);

        new Subscription(this, 'SubscriberSubscription', {
            endpoint: queue.queueArn,
            protocol: SubscriptionProtocol.SQS,
            topic: topic
        });
    }
}

const app = new App();
new CrossAccountEventingSubscriberStack(app, 'CrossAccountEventingSubscriberStack');
