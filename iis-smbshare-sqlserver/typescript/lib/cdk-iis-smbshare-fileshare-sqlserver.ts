import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import { SslPolicy } from '@aws-cdk/aws-elasticloadbalancingv2';
import { Tags } from '@aws-cdk/core';
import { BastionHostStack } from './constructs/bastion-stack';
import { AdFsxStack } from './constructs/ad-fsx-smbshare-stack';
import { SQLStack } from './constructs/sql-stack';
import { WindowsAutoScalingStack } from './constructs/windows-autoscaling-stack';
import { ApplicationLoadBalancerStack } from './constructs/alb-stack';


export class CdkIISSmbShareSqlserverStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);


    // This value is prepended to all the resource ids for easier identification
    const prefix = 'dev';
    // If new vpc needs to be created, then keep this value as empty string
    // If resources need to be created in existing vpc, provide vpc Id from AWS Console here
    const existingVpcId = '';
    // This value should match the key generated from AWS Console -> EC2 Key Pairs
    const keyName = "example";
    // The name of the Active Directory Domain
    const domainName = "example.corp.com";

    // The name of domain account which can be used for following purposes:
    // 1. This account is configured as Administrator of Windows EC2 instance Web Servers
    // 2. This account is configured to have read/write access to smb share
    // 3. This account is set as identity for IIS web application pool
    // 4. This account can be configured to access SQL Server RDS instance with integrated security
    const domainUserName = "web-user";

    // Sql Server Admin User Name. Need to setup databases/migrations
    const dbAdminUserName = "admin";

    // Sql Server Admin Password
    const dbAdminPasswordSecretName = "db-admin-secret";

    // Sql Server Listening port
    const dbPort = 1433;

    //If existing certificate needs to be used for configuring https site, upload the certificate in pfx format to s3 bucket and provide the bucket name
    const s3CertificateBucketname = '';

    //once cerficate is imported into AWS Certificate Manager, provide the certificate ARN below. This is used to configure the Application Load Balancer Listener
    const certificateArn = '';

    // certificate pfx file password
    const certificatePassword = '';

    // IIS App Pool Name to configure for the web application
    const iisAppPoolName = 'my-web-app';

    // Web site Host Name. Used to configure the IIS Website Binding Host Name
    const iisbindingHostName = '*';

    // Web site Port. Used to configure the IIS Webiste Binding port for the Web application
    const webSitePort = 90;

    // The host name in which certificate gets imported to local machine certificate store (Cert:\LocalMachine\MY)
    // This should be the one used to get SSL certificate from the SSL Certificate provider
    const sslCertHostname = "example.com";

    // Store the cloud watch agent config in the Parameter Store under the name "WindowsCloudWatchAgentConfig"
    // This parameter value will be used to configure cloud watch agent on each ec2 instance
    // Generate cloudwatch_agent_config.json file locally and upload to parameter store using aws cli as below.
    // aws ssm put-parameter --name "WindowsCloudWatchAgentConfig" --type "String" --value file://C:\\temp\\cloudwatch_agent_config.json --overwrite --tier Intelligent-Tiering --profile <aws_profile>
    // sample cloudwatch_agent_config.json is provided under lib folder
    const cloudWatchAgentConfigParameterName = 'WindowsCloudWatchAgentConfig';

    // Set the Code pipeline to generate build output as msi and upload to the S3 bucket. The build output uri should be set below.
    // This msi is used to deploy the code whenever new ec2 spins up by autoscaling group
    // Use the same msi in Code Deploy to deploy the code whenever new release is getting deployed
    const s3BuildOutputMsiUri = '';

    //Step 1:  Create/Get Vpc
    let vpc = null;
    console.log(existingVpcId);
    if (existingVpcId?.trim() != "") {
      vpc = ec2.Vpc.fromLookup(this, `${prefix}-import-vpc`, {
        vpcId: existingVpcId
      });
    }
    else {
      vpc = new ec2.Vpc(this, `${prefix}-create-vpc`,
        {
          maxAzs: 2
        });
      Tags.of(vpc).add("Name", `${prefix}-create-vpc`);
      new cdk.CfnOutput(this, `${prefix}-create-vpc-id`, { value: vpc.vpcId });
    }

    //Step 2: Create Bation Host
    const bastionStack = new BastionHostStack(this, 'BastionHostStack', props, {
      prefix: prefix,
      vpc: vpc,
      keyName: keyName,
      tags: [{
        Key: "Bastion",
        Value: "Patch_EverySunday_10AM_CST"
      }]
    });

    //Step 3: Create Managed AD and FSX file system (SMB  File Share)
    const adfsxStack = new AdFsxStack(this, 'AdFsxStack',{
      prefix: prefix,
      vpc: vpc,
      adDnsDomainName: domainName,
      domainUserName: domainUserName
    });

    //Step 4: Create SQL Server RDS
    const sqlStack = new SQLStack(this, 'SQLServerStack', props, {
      prefix: prefix,
      vpc: vpc,
      user: dbAdminUserName,
      secretName: dbAdminPasswordSecretName,
      port: dbPort,
      bastionSecurityGroup: bastionStack.bastionSecurityGroup,
      domain: adfsxStack.ad
    });

    sqlStack.addDependency(adfsxStack);
    sqlStack.sqlInstance.node.addDependency(adfsxStack.ad);
    bastionStack.addDependency(sqlStack);
    bastionStack.bastionHost.node.addDependency(sqlStack.sqlInstance);

    //Step 5: Create Application Load Balancer
    const albStack = new ApplicationLoadBalancerStack(this,'ApplicationLoadBalancerStack', props,{
      prefix: prefix,
      vpc: vpc,
      certificateArn: certificateArn
    });
    //Step 5: Create AutoScaling group
    // Use this when AutoScaling/Application Load Balancer need to run as separate stack for easier testing/debugging
    // const bastionSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
    //   this,
    //   'bastion-security-group',
    //   '<bastion security group id created by previous stack>'
    // );
    const asgStack = new WindowsAutoScalingStack(this, 'AutoScalingGroupStack', props, {
      prefix: prefix,
      vpc: vpc,
      // Use this when AutoScaling/Application Load Balancer need to run as separate stack for easier testing/debugging
      //bastionSecurityGroup: bastionSecurityGroup as any,
      bastionSecurityGroup: bastionStack.bastionSecurityGroup, 
      albSecurityGroup: albStack.albSecurityGroup,
      keyName: keyName,
      parentStackId: this.stackId,
      domain: domainName,
      domainUserName: domainUserName,
      s3CertificateBucketname: s3CertificateBucketname,
      certificatePassword: certificatePassword,
      iisAppPoolName: iisAppPoolName,
      iisbindingHostName: iisbindingHostName,
      sslCertHostname: sslCertHostname,
      cloudWatchAgentConfigParameterName: cloudWatchAgentConfigParameterName,
      fileSystemDnsName: adfsxStack.fsDnsName,
      s3BuildOutputMsiUri: s3BuildOutputMsiUri,
    });
    asgStack.addDependency(adfsxStack);
    sqlStack.securityGroup.connections.allowFrom(asgStack.securityGroup, ec2.Port.tcp(1433), 'Allow incoming from Windows instances');

    //Step 6: Add AutoScaling Group as targets for Application Load Balancer
    // Client should direct the web request to following Application Load Balancer port
    let listenerPort = 80;
    let applicationProtocol: elbv2.ApplicationProtocol;
    let listener : elbv2.IApplicationListener;
    if(certificateArn === ''){
      listener = albStack.alb.addListener(`${prefix}-alb-listener`,{
        port: listenerPort
      }); 
      applicationProtocol = elbv2.ApplicationProtocol.HTTP;
    }
    else{
      listenerPort = 443;
      listener = albStack.alb.addListener(`${prefix}-alb-listener`,{
        port: 443,
        sslPolicy: SslPolicy.TLS12_EXT,
        certificateArns: [certificateArn],
      });
      applicationProtocol = elbv2.ApplicationProtocol.HTTPS;
    }
    listener.addTargets('default-target', {
      //The port which is configured for the application in IIS Binding
      port: webSitePort,
      protocol: applicationProtocol,
      targets: [asgStack.asg],
      healthCheck: {
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: 5,
        unhealthyThresholdCount: 2,
        interval: cdk.Duration.seconds(30),
        healthyHttpCodes: "200",
        // The port and path should match the deployed web application's port and root page
        // Assumption : The web application to be deployed should have binding at port 90 and the home page should be /index.html
        port: webSitePort.toString(),
        path: '/index.html'
      }
    });
  }
}
