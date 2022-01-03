import * as fs from 'fs'
import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as secrets from '@aws-cdk/aws-secretsmanager'
import * as autoscaling from '@aws-cdk/aws-autoscaling'
import * as iam from '@aws-cdk/aws-iam'
import * as ssm from '@aws-cdk/aws-ssm';
import { CfnAutoScalingGroup } from '@aws-cdk/aws-autoscaling'

interface AutoScalingProps {
  prefix: string
  vpc: ec2.IVpc
  keyName: string
  bastionSecurityGroup?: ec2.SecurityGroup,
  albSecurityGroup?: ec2.SecurityGroup,
  parentStackId: string,
  domain: string,
  domainUserName: string,
  s3CertificateBucketname: string,
  certificatePassword: string,
  iisAppPoolName: string,
  iisbindingHostName: string,
  sslCertHostname: string,
  cloudWatchAgentConfigPath: string,
  fileSystemDnsName: string,
  s3BuildOutputMsiUri:string,
}

/**
 * Creates the EC2 AutoscalingGroup
 *
 * @param  {cdk.Construct} scope stack application scope
 * @param  {StackProps} props props needed to create the resource
 *
 */
export class WindowsAutoScalingStack extends cdk.Stack {
  // export our newly created instance
  public readonly asg: autoscaling.AutoScalingGroup;
  public readonly securityGroup: ec2.SecurityGroup;
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps, autoScalingProps: AutoScalingProps) {
    super(scope, id, props);
    // use the vpc we just created
    const customVPC = autoScalingProps.vpc

    // define a role for the windows instances
    const signalCloudFormation = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ['*'],
          actions: [
            'cloudformation:DescribeStackResource',
            'cloudformation:SignalResource'
          ],
          effect: iam.Effect.ALLOW
        }),
      ],
    });
    const role = new iam.Role(scope, `${autoScalingProps.prefix}-windows-instance-role`, {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ec2.amazonaws.com'),
        new iam.ServicePrincipal('ssm.amazonaws.com')
      ),
      managedPolicies: [
        // allows us to access instance via SSH using IAM and SSM
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore'
        ),
        // allows ec2 instance to access secrets manager and retrieve secrets
        // needed to add windows host to domain
        iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'),
        //allows ec2 instance to download source code from s3 bucket
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
        //allows ssm session to be established on instance, allows instance to access parameter store
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'),
        // allows ec2 instance cloudwatch agent to send logs to cloudwatch
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
      ],
      inlinePolicies:{
          "signalCloudFormation" : signalCloudFormation
        }
    })

    // lets create a security group for the windows instances
    this.securityGroup = new ec2.SecurityGroup(
      scope,
      `${autoScalingProps.prefix}-windows-instances-sg`,
      {
        vpc: customVPC,
        allowAllOutbound: true,
        securityGroupName: `${autoScalingProps.prefix}-windows-instances-sg`,
      }
    )
    if (autoScalingProps.albSecurityGroup)
      this.securityGroup.connections.allowFrom(autoScalingProps.albSecurityGroup, ec2.Port.tcpRange(0, 65535), 'Allow incoming connections from Load Balancer');
    if(autoScalingProps.bastionSecurityGroup)
        this.securityGroup.connections.allowFrom(autoScalingProps.bastionSecurityGroup, ec2.Port.tcp(3389), 'Allow incoming RDP from Bastion host');

    // create and export out autoscaling group
    
    this.asg = new autoscaling.AutoScalingGroup(scope, `${autoScalingProps.prefix}-asg`, {
      autoScalingGroupName: `${autoScalingProps.prefix}-asg`,
      vpc: autoScalingProps.vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.C3,
        ec2.InstanceSize.LARGE
      ),
      machineImage: ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE),
      securityGroup: this.securityGroup,
      role: role,
      minCapacity: 2,
      maxCapacity: 4,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      keyName: autoScalingProps.keyName,
      signals: autoscaling.Signals.waitForAll({
        // Configure the timeout based on the time taken by all init scripts to complete including restarting the machine step
        timeout: cdk.Duration.minutes(90)
      })
    });

    const autoScalingGroupCfn = <CfnAutoScalingGroup> this.asg.node.tryFindChild('ASG');

    // Store CloudWatchConfig in ParameterStore and use it to configure Cloud Watch Agent in EC2 instance
    let cloudWatchAgentConfigParameterName = '';
    if(autoScalingProps.cloudWatchAgentConfigPath !== ''){
      cloudWatchAgentConfigParameterName = 'WindowsCloudWatchAgentConfig';
      const cloudWatchAgentConfig = fs.readFileSync(autoScalingProps.cloudWatchAgentConfigPath, 'utf8');
      // console.log(cloudWatchAgentConfig);
      const cloudWatchAgentConfigParameter = new ssm.StringParameter(scope, 'cloud-watch-agent-config', {
        parameterName: cloudWatchAgentConfigParameterName,
        stringValue: cloudWatchAgentConfig,
        description: 'cloud watch agent config used to configure cloud watch agent in EC2 instance',
        type: ssm.ParameterType.STRING,
        tier: ssm.ParameterTier.STANDARD
      });
    }

    const initData = ec2.CloudFormationInit.fromElements(
      ec2.InitFile.fromAsset("c:\\cfn\\1-setup-website.ps1", "lib/scripts/1-setup-website.ps1"),
      // Install any other softwares needed
      // Included script will install sql management studio for testing the connection to SQL RDS
      // Included script will install code deploy agent so that code will be deployed from build pipeline
      ec2.InitFile.fromAsset("c:\\cfn\\2-install-softwares.ps1",'lib/scripts/2-install-softwares.ps1'),

      ec2.InitFile.fromString("c:\\cfn\\3-add-machine-to-domain-map-network-drive.ps1",
        fs.readFileSync('lib/scripts/3-add-machine-to-domain-map-network-drive.ps1', 'utf8')
          .replace(/##replace_with_domain##/g, autoScalingProps.domain)
          .replace(/##replace_file_share_dns_name##/g, autoScalingProps.fileSystemDnsName)
        ),

        ec2.InitFile.fromString("c:\\cfn\\6-create-add-AD-user.ps1",
        fs.readFileSync('lib/scripts/6-create-add-AD-user.ps1', 'utf8')
          .replace(/##replace_with_domain##/g, autoScalingProps.domain)
          .replace(/##replace_with_domain_user_name##/g, autoScalingProps.domainUserName)),

          ec2.InitFile.fromString("c:\\cfn\\7-import-certificate-from-s3.ps1",
        fs.readFileSync('lib/scripts/7-import-certificate-from-s3.ps1', 'utf8')
          .replace(/##replace_with_certificate_bucket_name##/g, autoScalingProps.s3CertificateBucketname)
          .replace(/##replace_with_certificate_password##/, autoScalingProps.certificatePassword)
      ),
      ec2.InitFile.fromString("c:\\cfn\\8-create-webapp-set-apppool.ps1",
        fs.readFileSync('lib/scripts/8-create-webapp-set-apppool.ps1', 'utf8')
          .replace(/##replace_with_app_pool_name##/g, autoScalingProps.iisAppPoolName)
          .replace(/##replace_with_domain##/g, autoScalingProps.domain)
          .replace(/##replace_with_bindinghost##/g, autoScalingProps.iisbindingHostName)
          .replace(/##replace_with_ssl_cert_host_name##/g, autoScalingProps.sslCertHostname)
          .replace(/##replace_with_certificate_bucket_name##/g, autoScalingProps.s3CertificateBucketname)
      ),

      ec2.InitFile.fromString("c:\\cfn\\9-install-configure-cloudwatch-agent.ps1",
        fs.readFileSync('lib/scripts/9-install-configure-cloudwatch-agent.ps1', 'utf8')
          .replace(/##replace_with_agent_config_parameter_name##/g, cloudWatchAgentConfigParameterName)
      ),

      ec2.InitFile.fromString("c:\\cfn\\90-install-website-from-buildoutput.ps1",
        fs.readFileSync('lib/scripts/90-install-website-from-buildoutput.ps1', 'utf8')
          .replace(/##replace_with_s3_build_output_msi_uri##/g, autoScalingProps.s3BuildOutputMsiUri)
      ),

      // Scripts order is determined by sorting alphabetically in ascending order
      ec2.InitCommand.shellCommand('powershell.exe -File "c:\\cfn\\1-setup-website.ps1"', { key: "1-setup-website", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(10)) }),
      ec2.InitCommand.shellCommand('powershell.exe -File "c:\\cfn\\2-install-softwares.ps1"', { key: "2-install-softwares", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(10)) }),
      ec2.InitCommand.shellCommand('powershell.exe -File "c:\\cfn\\3-add-machine-to-domain-map-network-drive.ps1"', { key: "3-add-machine-to-domain-map-network-drive", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(10)) }),
      ec2.InitCommand.shellCommand('powershell.exe -Command Install-WindowsFeature RSAT-ADDS', { key: "4-Install-Rsat", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(120)) }),
      // //wait forever to make sure command resume once restart
      ec2.InitCommand.shellCommand('powershell.exe -Command Restart-Computer -force', { key: "5-Restart", waitAfterCompletion: ec2.InitCommandWaitDuration.forever() }),
      
      ec2.InitCommand.shellCommand('powershell.exe -File "c:\\cfn\\6-create-add-AD-user.ps1"', { key: "6-create-add-AD-user.ps1", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(10)) }),
      ec2.InitCommand.shellCommand('powershell.exe -File "c:\\cfn\\7-import-certificate-from-s3.ps1"', { key: "7-import-certificate-from-s3", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(10)) }),
      ec2.InitCommand.shellCommand('powershell.exe -File "c:\\cfn\\8-create-webapp-set-apppool.ps1"', { key: "8-create-webapp-set-apppool", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(10)) }),
      ec2.InitCommand.shellCommand('powershell.exe -File "c:\\cfn\\9-install-configure-cloudwatch-agent.ps1"', { key: "9-install-configure-cloudwatch-agent", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(10)) }),
      ec2.InitCommand.shellCommand('powershell.exe -File "c:\\cfn\\90-install-website-from-buildoutput.ps1"', { key: "90-install-website-from-buildoutput", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(10)) }),
      ec2.InitCommand.shellCommand('powershell.exe -Command Restart-Computer -force', { key: "91-Restart", waitAfterCompletion: ec2.InitCommandWaitDuration.forever() }),
      ec2.InitCommand.shellCommand('cfn-signal.exe -e %ERRORLEVEL% --resource ' + autoScalingGroupCfn.logicalId + ' --stack ' + autoScalingProps.parentStackId + ' --region ' + this.region  + ' --role ' + role.roleName , { key: "92-Signal", waitAfterCompletion: ec2.InitCommandWaitDuration.of(cdk.Duration.seconds(5)) })
      );
    this.asg.applyCloudFormationInit(
      initData,{
        //If Init steps need to be debug, then follow the steps below
        // 1. Set this flag to true
        // 2. Wait for Windows EC2 instance to be fully created in AWS Console
        // 3. Connect to Windows EC2 instance using SSM Manager
        // 4. All the scripts and execution logs located in c:\cfn folder
        // 5. Inspect c:\cfn:\cfn-init.log for any errors
        // Once the errors are resolved, Set the flag to false. Otherwise Stack creation will be successful even when EC2 instances are failed to create
        ignoreFailures: true,
      });
  }
}