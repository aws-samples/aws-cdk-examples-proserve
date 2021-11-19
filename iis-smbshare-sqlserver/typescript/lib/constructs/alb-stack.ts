import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2'
import { ApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';

interface ALBProps {
  prefix: string
  vpc: ec2.IVpc
  certificateArn: string
}

export class ApplicationLoadBalancerStandardized extends elbv2.ApplicationLoadBalancer {

  public addListener(id: string, props: elbv2.BaseApplicationListenerProps): elbv2.ApplicationListener {
      // cast to any so we can override a "readonly" property.
      (props.sslPolicy as any) = elbv2.SslPolicy.FORWARD_SECRECY_TLS12;
      return super.addListener(id, props);
  }
}

/**
 * Creates an Application Load Balancer for our Wordpress stack
 *
 * @param  {cdk.Construct} scope stack application scope
 * @param  {StackProps} props props needed to create the resource
 *
 */
export class ApplicationLoadBalancerStack extends cdk.Stack{
  public readonly loadBalancerDnsName: string
  public readonly alb: ApplicationLoadBalancerStandardized;
  public readonly albSecurityGroup: ec2.SecurityGroup;

  constructor(scope: cdk.Construct, id:string, props: cdk.StackProps, albProps: ALBProps) {
    super(scope, id, props);
    this.albSecurityGroup = new ec2.SecurityGroup(
      scope,
      `${albProps.prefix}-alb-sg`,
      {
        vpc: albProps.vpc,
        allowAllOutbound: true,
        securityGroupName: `${albProps.prefix}-alb-sg`,
      }
    );
    if(albProps.certificateArn === ''){
      this.albSecurityGroup.addIngressRule(
        ec2.Peer.ipv4("0.0.0.0/0"),
        ec2.Port.tcp(80),
        'Allows HTTP access from outside world'
      );  
      this.alb = new ApplicationLoadBalancer(
        scope,
        `${albProps.prefix}-alb`,
        {
          loadBalancerName: `${albProps.prefix}`,
          vpc: albProps.vpc,
          internetFacing: true,
          securityGroup: this.albSecurityGroup
        }
      )
    }
    else{
      this.albSecurityGroup.addIngressRule(
        ec2.Peer.ipv4("0.0.0.0/0"),
        ec2.Port.tcp(443),
        'Allows HTTPS access from outside world'
      );
      this.alb = new ApplicationLoadBalancerStandardized(
        scope,
        `${albProps.prefix}-alb`,
        {
          loadBalancerName: `${albProps.prefix}`,
          vpc: albProps.vpc,
          internetFacing: true,
          securityGroup: this.albSecurityGroup
        }
      );
    }
    new cdk.CfnOutput(scope, 'LoadBalancerDnsName', { value: this.alb.loadBalancerName });
  }
}