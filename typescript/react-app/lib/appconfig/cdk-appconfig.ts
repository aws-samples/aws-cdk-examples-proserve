import { Construct } from 'constructs';
import {
  aws_appconfig as appconfig,
  aws_iam as iam,
  CfnOutput,
  Duration,
  Expiration,
  Stack,
  StackProps
} from "aws-cdk-lib";
import featureFlags from './featureFlags.json';
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import { FieldLogLevel } from "@aws-cdk/aws-appsync-alpha";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Architecture, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export interface AppConfigProps {
  downstream: appsync.IGraphqlApi
}

export class CdkAppConfig extends Construct {
  public readonly appSyncApi: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id);

    // AppConfig Application
    const appconfigApplication = new appconfig.CfnApplication(this, 'ReactAppConfigApplication', {
      name: 'ReactAppConfigApplication',
      description: 'Application resource creates an application. In AWS AppConfig , an application is simply an organizational construct like a folder.'
    });

    new CfnOutput(this, 'AppConfigApplicationId', {
      value: appconfigApplication.ref,
    });

    const appConfigDevelopmentEnvironment = new appconfig.CfnEnvironment(this, 'ReactAppConfigDevEnvironment', {
      applicationId: appconfigApplication.ref,
      name: 'ReactAppConfigDevEnvironment',
      description: 'Environment resource creates an environment, which is a logical deployment group of AWS AppConfig targets, such as applications in a Dev, Beta, or Production environment.'
    });

    new CfnOutput(this, 'AppConfigEnvironmentId', {
      value: appConfigDevelopmentEnvironment.ref,
    });

    appConfigDevelopmentEnvironment.node.addDependency(appconfigApplication);

    const appconfigConfigurationProfile = new appconfig.CfnConfigurationProfile(this, 'ReactAppConfigConfigurationProfile', {
      applicationId: appconfigApplication.ref,
      locationUri: 'hosted',
      name: 'ReactAppConfigConfigurationProfile',
      description: 'ConfigurationProfile resource creates a configuration profile that enables AWS AppConfig to access the configuration source.  In this example, the source is a json file containing our feature flag key/value pairs hosted by AppConfig.'
    });

    new CfnOutput(this, 'AppConfigConfigurationProfileId', {
      value: appconfigConfigurationProfile.ref,
    });

    appconfigConfigurationProfile.node.addDependency(appconfigApplication);

    const appconfigHostedConfigurationVersion = new appconfig.CfnHostedConfigurationVersion(this, 'ReactAppConfigHostedConfigurationVersion', {
      applicationId: appconfigApplication.ref,
      configurationProfileId: appconfigConfigurationProfile.ref,
      content: JSON.stringify(featureFlags),
      contentType: 'application/json',
      description: 'A configuration stored in the AWS AppConfig hosted configuration store. This is where the feature flag key/value pairs will be stored.'
    });

    new CfnOutput(this, 'AppConfigHostedConfigurationVersionId', {
      value: appconfigHostedConfigurationVersion.ref,
    });

    appconfigHostedConfigurationVersion.node.addDependency(appconfigApplication);
    appconfigHostedConfigurationVersion.node.addDependency(appconfigConfigurationProfile);

    const appconfigDeploymentStrategy = new appconfig.CfnDeploymentStrategy(this, 'ReactAppConfigDeploymentStrategy', {
      deploymentDurationInMinutes: 1,
      growthFactor: 100,
      name: 'ReactAppConfigDeploymentStrategy',
      description: 'DeploymentStrategy resource creates an AWS AppConfig deployment strategy that defines important criteria for rolling out your configuration to the designated targets, including the overall duration required, a percentage of targets to receive the deployment during each interval, an algorithm that defines how percentage grows, and bake time. This example is an immediate deployment strategy.',
      finalBakeTimeInMinutes: 0,
      replicateTo: 'NONE'
    });

    const appconfigDeployment = new appconfig.CfnDeployment(this, 'ReactAppConfigDeployment', {
      applicationId: appconfigApplication.ref,
      configurationProfileId: appconfigConfigurationProfile.ref,
      environmentId: appConfigDevelopmentEnvironment.ref,
      deploymentStrategyId: appconfigDeploymentStrategy.ref,
      configurationVersion: appconfigHostedConfigurationVersion.ref
    });

    appconfigDeployment.node.addDependency(appconfigApplication);
    appconfigDeployment.node.addDependency(appconfigConfigurationProfile);
    appconfigDeployment.node.addDependency(appConfigDevelopmentEnvironment);
    appconfigDeployment.node.addDependency(appconfigDeploymentStrategy);
    appconfigDeployment.node.addDependency(appconfigHostedConfigurationVersion);

    this.appSyncApi = new appsync.GraphqlApi(this, 'FeatureFlagApi', {
      name: 'feature-flags-api',
      schema: appsync.Schema.fromAsset(`${__dirname}/schema.graphql`),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: Expiration.after(Duration.days(365))
          }
        }
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
        excludeVerboseContent: false,
        role: new iam.Role(this, 'AppSyncApiCloudWatchRole', {
          roleName: 'AppSyncApiCloudWatchRole',
          assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
          managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSAppSyncPushToCloudWatchLogs')]
        })
      }
    });

    const appConfigLambda = new NodejsFunction(this, 'AppConfigHandler', {
      architecture: Architecture.ARM_64,
      entry: `${__dirname}/lambda-resolver.ts`,
      logRetention: RetentionDays.ONE_WEEK,
      runtime: Runtime.NODEJS_14_X,
      environment: {
        AWS_APPCONFIG_EXTENSION_HTTP_PORT: '2772',
        AWS_APPCONFIG_EXTENSION_POLL_INTERVAL_SECONDS: '45',
        AWS_APPCONFIG_EXTENSION_POLL_TIMEOUT_MILLIS: '3000',
        AWS_APPCONFIG_APPLICATION_ID: appconfigApplication.ref,
        AWS_APPCONFIG_ENVIRONMENT_ID: appConfigDevelopmentEnvironment.ref,
        AWS_APPCONFIG_CONFIGURATION_ID: appconfigConfigurationProfile.ref,
        AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: '',
      },
      layers: [
        LayerVersion.fromLayerVersionArn(this, 'AppConfigLambdaExtension', 'arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension-Arm64:2')
      ]
    });

    appConfigLambda.addToRolePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:aws:appconfig:${Stack.of(this).region}:${Stack.of(this).account}:application/${appconfigApplication.ref}*`
        ],
        actions: ['appconfig:GetConfiguration', 'appconfig:StartConfigurationSession', 'appconfig:GetLatestConfiguration'],
        effect: iam.Effect.ALLOW
      })
    );

    // Set the new Lambda function as a data source for the AppSync API
    const lambdaDataSource = this.appSyncApi.addLambdaDataSource('lambdaDatasource', appConfigLambda);
    lambdaDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'getAppConfigData'
    });
  }
}
