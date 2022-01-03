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

    const parameters = this.node.tryGetContext('parameters');
    if(!parameters){
      console.log('Please specify parameters in cdk.json file to continue....');
      return;
    }
    
    //Step 1:  Create/Get Vpc
    let vpc = null;
    console.log(parameters.existingVpcId);
    if (parameters.existingVpcId?.trim() != "") {
      vpc = ec2.Vpc.fromLookup(this, `${parameters.prefix}-import-vpc`, {
        vpcId: parameters.existingVpcId
      });
    }
    else {
      vpc = new ec2.Vpc(this, `${parameters.prefix}-create-vpc`,
        {
          maxAzs: 2
        });
      Tags.of(vpc).add("Name", `${parameters.prefix}-create-vpc`);
      new cdk.CfnOutput(this, `${parameters.prefix}-create-vpc-id`, { value: vpc.vpcId });
    }

    //Step 2: Create Bation Host
    const bastionStack = new BastionHostStack(this, 'BastionHostStack', props, {
      prefix: parameters.prefix,
      vpc: vpc,
      keyName: parameters.keyName,
      tags: [{
        Key: "Bastion",
        Value: "Patch_EverySunday_10AM_CST"
      }]
    });

    //Step 3: Create Managed AD and FSX file system (SMB  File Share)
    const adfsxStack = new AdFsxStack(this, 'AdFsxStack',{
      prefix: parameters.prefix,
      vpc: vpc,
      adDnsDomainName: parameters.domainName,
      domainUserName: parameters.domainUserName
    });

    //Step 4: Create SQL Server RDS
    const sqlStack = new SQLStack(this, 'SQLServerStack', props, {
      prefix: parameters.prefix,
      vpc: vpc,
      user: parameters.dbAdminUserName,
      secretName: parameters.dbAdminPasswordSecretName,
      port: parameters.dbPort,
      bastionSecurityGroup: bastionStack.bastionSecurityGroup,
      domain: adfsxStack.ad
    });

    sqlStack.addDependency(adfsxStack);
    sqlStack.sqlInstance.node.addDependency(adfsxStack.ad);
    bastionStack.addDependency(sqlStack);
    bastionStack.bastionHost.node.addDependency(sqlStack.sqlInstance);

    //Step 5: Create Application Load Balancer
    const albStack = new ApplicationLoadBalancerStack(this,'ApplicationLoadBalancerStack', props,{
      prefix: parameters.prefix,
      vpc: vpc,
      certificateArn: parameters.certificateArn
    });
    //Step 5: Create AutoScaling group
    // Use this when AutoScaling/Application Load Balancer need to run as separate stack for easier testing/debugging
    // const bastionSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
    //   this,
    //   'bastion-security-group',
    //   '<bastion security group id created by previous stack>'
    // );
    const asgStack = new WindowsAutoScalingStack(this, 'AutoScalingGroupStack', props, {
      prefix: parameters.prefix,
      vpc: vpc,
      // Use this when AutoScaling/Application Load Balancer need to run as separate stack for easier testing/debugging
      //bastionSecurityGroup: bastionSecurityGroup as any,
      bastionSecurityGroup: bastionStack.bastionSecurityGroup, 
      albSecurityGroup: albStack.albSecurityGroup,
      keyName: parameters.keyName,
      parentStackId: this.stackId,
      domain: parameters.domainName,
      domainUserName: parameters.domainUserName,
      // SSL is configured for each Web Server to ensure end to end encryption
      s3CertificateBucketname: parameters.s3CertificateBucketname,
      certificatePassword: parameters.certificatePassword,
      iisAppPoolName: parameters.iisAppPoolName,
      iisbindingHostName: parameters.iisbindingHostName,
      sslCertHostname: parameters.sslCertHostname,
      cloudWatchAgentConfigPath: parameters.cloudWatchAgentConfigPath,
      fileSystemDnsName: adfsxStack.fsDnsName,
      s3BuildOutputMsiUri: parameters.s3BuildOutputMsiUri,
    });
    asgStack.addDependency(adfsxStack);
    sqlStack.securityGroup.connections.allowFrom(asgStack.securityGroup, ec2.Port.tcp(1433), 'Allow incoming from Windows instances');

    //Step 6: Add AutoScaling Group as targets for Application Load Balancer
    // Client should direct the web request to following Application Load Balancer port
    let listenerPort = 80;
    let applicationProtocol: elbv2.ApplicationProtocol;
    let listener : elbv2.IApplicationListener;
    if(parameters.certificateArn === ''){
      listener = albStack.alb.addListener(`${parameters.prefix}-alb-listener`,{
        port: listenerPort
      }); 
      applicationProtocol = elbv2.ApplicationProtocol.HTTP;
    }
    else{
      listenerPort = 443;
      listener = albStack.alb.addListener(`${parameters.prefix}-alb-listener`,{
        port: 443,
        sslPolicy: SslPolicy.TLS12_EXT,
        certificateArns: [parameters.certificateArn],
      });
      applicationProtocol = elbv2.ApplicationProtocol.HTTPS;
    }
    listener.addTargets('default-target', {
      //The port which is configured for the application in IIS Binding
      port: parameters.webSitePort,
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
        port: parameters.webSitePort.toString(),
        path: '/index.html'
      }
    });
  }
}
