import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as iam from '@aws-cdk/aws-iam'
import { Tags } from '@aws-cdk/core';
import { Tag } from '../tag-interface';

interface BastionHostProps {
  // This value is prepended to all the resource ids for easier identification
  prefix: string
  // The vpc in which bastion is placed
  vpc: ec2.IVpc
  // The name pem key pair generated from AWS EC2 Console
  keyName: string
  // Tags need to attached to bastion host
  tags?: Tag[]
}

/**
 * Creates the Bastion Host using Amazon Linux AMI
 */
export class BastionHostStack extends cdk.Stack {
  // exports
  public readonly bastionHost: ec2.Instance;
  public readonly bastionSecurityGroup: ec2.SecurityGroup;
  
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps, bastionHostProps: BastionHostProps) {
    super(scope, id, props);
    
    // vpc where bastion host is placed
    const customVPC = bastionHostProps.vpc

    // define a role for the bastion host
    const role = new iam.Role(scope, `${bastionHostProps.prefix}-bastion-instance-role`, {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ec2.amazonaws.com'),
        new iam.ServicePrincipal('ssm.amazonaws.com')
      ),
      managedPolicies: [
        // allows access to bastion host via SSH using IAM and SSM
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore'
        ),
        // allows host to access secrets maanger and retrieve secrets
        iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'),
      ],
    })

    // create a security group for the bastion host
    this.bastionSecurityGroup = new ec2.SecurityGroup(
      scope,
      `${bastionHostProps.prefix}-bastion-instance-sg`,
      {
        vpc: customVPC,
        allowAllOutbound: true,
        securityGroupName: `${bastionHostProps.prefix}-bastion-instance-sg`,
      }
    )

    // finally create the bastion host
    this.bastionHost = new ec2.Instance(scope, `${bastionHostProps.prefix}-bastion-instance`, {
      instanceName: `${bastionHostProps.prefix}-bastion-instance`,
      vpc: customVPC,
      role: role as any,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      keyName: bastionHostProps.keyName,
      securityGroup: this.bastionSecurityGroup,
    });

    bastionHostProps.tags?.forEach(tag => Tags.of(this.bastionHost).add(tag.Key, tag.Value));

    //outputs
    new cdk.CfnOutput(scope, 'BastionHostInstanceId', { value: this.bastionHost.instanceId });
    new cdk.CfnOutput(scope, 'BastionSecurityGroupId', { value: this.bastionSecurityGroup.securityGroupId});
  }
}