import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ad from '@aws-cdk/aws-directoryservice';
import * as fsx from '@aws-cdk/aws-fsx';
import * as sm from '@aws-cdk/aws-secretsmanager';

interface AdFsxProps {
    // This value is prepended to all the resource ids for easier identification
    prefix: string
    // The vpc in which bastion is placed
    vpc: ec2.IVpc,
    // Dns name of the Managed AD domain - For eg. example.corp.com
    adDnsDomainName: string,
    // Domain user needs to be created in addition to Domain Admin user
    domainUserName: string
}
export class AdFsxStack extends cdk.Stack {
  // exports
  public readonly fsDnsName: string;
  public readonly fileSystem : fsx.CfnFileSystem;
  public readonly domainId : string;
  public readonly ad: ad.CfnMicrosoftAD;
  constructor(scope: cdk.Construct, id: string, adfsxProps: AdFsxProps) {
    super(scope, id);

    const vpc = adfsxProps.vpc;
    const privateSubnets = vpc.privateSubnets.slice(0,2).map(x => x.subnetId)

    // create secret to store password for ad account "domainUserName"
    // this account is used to run the web app as well sql authentication using Integrated Security
    const webUserSecret = new sm.Secret(scope, `${adfsxProps.adDnsDomainName}-web-password`, {
      secretName: `${adfsxProps.adDnsDomainName}-web-password`,
      description: `${adfsxProps.adDnsDomainName}-web-user-password`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 'Domain': adfsxProps.adDnsDomainName, 'UserID': adfsxProps.domainUserName}),
        generateStringKey: 'password'
      },
    });

    // create secret to store password for Domain "Admin" user
    const templatedSecret = new sm.Secret(scope, `${adfsxProps.adDnsDomainName}-mad-secret`, {
      secretName: `${adfsxProps.adDnsDomainName}-managed-ad-Admin-password`,
      description: `${adfsxProps.adDnsDomainName}-managed-ad-Admin-password`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({'Domain': adfsxProps.adDnsDomainName, 'UserID': 'Admin'}),
        generateStringKey: 'password'
      },
    });

    const mad = new ad.CfnMicrosoftAD(scope, `${adfsxProps.prefix}-ad`, {
      name: adfsxProps.adDnsDomainName,
      password: templatedSecret.secretValueFromJson('password').toString(),
      vpcSettings: {
        vpcId: vpc.vpcId,
        subnetIds: privateSubnets,
      },
    })
    
    this.ad = mad;

    const dhcpOptions = new ec2.CfnDHCPOptions(scope, 'dhcpOptions', {
      domainName: adfsxProps.adDnsDomainName,
      domainNameServers: mad.attrDnsIpAddresses,
    })

    //Attach the newly created Domain as DHCP option for the vpc so that all the instances which are part of vpc can be reached using
    //Domain DNS servers. Please refer https://docs.aws.amazon.com/vpc/latest/userguide/VPC_DHCP_Options.html for further reading
    new ec2.CfnVPCDHCPOptionsAssociation(scope, 'dhcpOptionsAssoc', {
      dhcpOptionsId: dhcpOptions.ref,
      vpcId: vpc.vpcId
    })

    //Create FSX file system
    
    // Create security group that needs to be attached to File System
    const fileSystemSecurityGroup = new ec2.SecurityGroup(
        scope,
        `${adfsxProps.prefix}-fileshare-sg`,
        {
            vpc: adfsxProps.vpc,
            securityGroupName: `${adfsxProps.prefix}-fileshare-sg`,
            allowAllOutbound: true,
        },
    );
    fileSystemSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(adfsxProps.vpc.vpcCidrBlock),
        ec2.Port.tcp(5985),
        'Allows WinRM-HTTP access from resources inside VPC'
    )
    fileSystemSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(adfsxProps.vpc.vpcCidrBlock),
        ec2.Port.tcp(445),
        'Allows SMB File share access from resources inside VPC'
    )

    this.fileSystem = new fsx.CfnFileSystem(scope, `${adfsxProps.prefix}-fs`, {
      fileSystemType: 'WINDOWS',
      subnetIds: privateSubnets,
      storageType: 'SSD',
      //Edit the value to desired file system capacity
      storageCapacity: 32, 
      windowsConfiguration: {
        activeDirectoryId: mad.ref,
        throughputCapacity: 8,
        deploymentType: 'MULTI_AZ_1',
        preferredSubnetId: privateSubnets[0],
        //By default, the file system can be access using smb url //shared-vol.domainname.com.
        //Edit as desired
        aliases: [`shared-vol.${adfsxProps.prefix}.com`]
      },
      securityGroupIds: [fileSystemSecurityGroup.securityGroupId],
      tags: [{
        key: 'Name',
        value: 'smb-share'
      }]
    })
    this.fsDnsName = this.fileSystem.attrDnsName;
    const outputs = [
      {"name":"directoryAlias","value":mad.attrAlias},
      {"name":"directoryDns","value":cdk.Fn.join(',',mad.attrDnsIpAddresses)},
      {"name":"fsType", "value": this.fileSystem.fileSystemType},
      {"name":"fs.attrDnsName", "value": this.fileSystem.attrDnsName},
      {"name":"subnetIds", "value": cdk.Fn.join(',',privateSubnets)},
      {"name":"domain-id", "value": mad.logicalId},
    ]

    outputs.forEach((x) => { 
      if (x.value) {
        new cdk.CfnOutput(scope, x.name, {value: x.value})
      }
    })
  }
}