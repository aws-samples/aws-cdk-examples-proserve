#!/usr/bin/env node
import 'source-map-support/register';
import {App, CfnOutput, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import {Topic} from "aws-cdk-lib/aws-sns";
import {AccountPrincipal, Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";

class CrossAccountEventingPublisherStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const topic = new Topic(this, 'PublisherTopic', {});

        const statement = new PolicyStatement({
            actions: ['sns:Subscribe'],
            effect: Effect.ALLOW,
            principals: [new AccountPrincipal('067120822963')],
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
