import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";
import * as ad from "@aws-cdk/aws-directoryservice";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";

// this is where we will keep our database credentials e.g. user, password, host etc
import * as secrets from "@aws-cdk/aws-secretsmanager";
import { RemovalPolicy, Tags } from "@aws-cdk/core";
import { ManagedPolicy } from "@aws-cdk/aws-iam";

interface SQLStackProps {
  // this is useful when deploying to multiple environments e.g. prod, dev
  prefix: string;
  // The vpc in which SQL Server Instance is placed
  vpc: ec2.IVpc;
  // Db admin user name
  user: string;
  // Db listening port
  port: number;
  // Db Secret Name. The password will be created in AWS Secrets Manager under <prefix>-<secretName>
  secretName: string;
  // Allow access to connections only from this security group
  bastionSecurityGroup: ec2.SecurityGroup;
  // AD Domain where SQL Server instance gets placed
  domain: ad.CfnMicrosoftAD;
}

/**
 * Creates a SQL Server DB on AWS RDS
 */
export class SQLStack extends cdk.Stack {
  public readonly sqlInstance: rds.DatabaseInstance;
  public readonly securityGroup: ec2.SecurityGroup;
  constructor(
    scope: cdk.Construct,
    id: string,
    props: cdk.StackProps,
    sqlStackProps: SQLStackProps
  ) {
    super(scope, id, props);
    const defaultVPC = sqlStackProps.vpc;
    // create the security group for RDS instance
    this.securityGroup = new ec2.SecurityGroup(
      scope,
      `${sqlStackProps.prefix}-rds-sg`,
      {
        vpc: defaultVPC,
        securityGroupName: `${sqlStackProps.prefix}-rds-sg`,
      }
    );
    this.securityGroup.connections.allowFrom(
      sqlStackProps.bastionSecurityGroup,
      ec2.Port.tcp(sqlStackProps.port || 1433),
      "Allow incoming from Bastion host"
    );

    // Dynamically generate the username and password, then store in secrets manager
    const databaseCredentialsSecret = new secrets.Secret(
      scope,
      `${sqlStackProps.prefix}-sql-server-credentials-secret`,
      {
        secretName: `${sqlStackProps.prefix}-${sqlStackProps.secretName}`,
        description: "Credentials to access SQL Database on RDS",
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: sqlStackProps.user,
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: "password",
        },
      }
    );

    // Following section is needed only when backup needs to restored from S3 Backup
    // Please refer https://aws.amazon.com/premiumsupport/knowledge-center/native-backup-rds-sql-server/ for further reading
    // Create S3 bucket when .bak file gets stored
    const backupRestoreBucketName = `${sqlStackProps.prefix}-s3-backup-restore-${this.account}-${this.region}`;
    const s3BackupRestoreBucket = new s3.Bucket(
      scope,
      backupRestoreBucketName,
      {
        bucketName: backupRestoreBucketName,
        versioned: false,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true
      }
    );

    new cdk.CfnOutput(scope, "backup-restore-bucket-arn", {
      value: s3BackupRestoreBucket.bucketArn,
    });

    // Role required by SQL Server instance to access Backup file
    const role = new iam.Role(scope, `${sqlStackProps.prefix}-sql-s3-readwrite-role`, {
      description: "Allows rds to access backup restore bucket",
      roleName: `${sqlStackProps.prefix}-sql-s3-readwrite-role`,
      assumedBy: new iam.ServicePrincipal("rds.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")]
    });

    const optionGroupRDS = new rds.OptionGroup(
      scope,
      `${sqlStackProps.prefix}-rds-sg-sql-backup-option-group`,
      {
        description: `${sqlStackProps.prefix}-rds-sg-sql-backup-option-group`,
        // Engine version should exactly match with the engine version passed to rds.DatabaseInstance method
        engine: rds.DatabaseInstanceEngine.sqlServerEx({
          version: rds.SqlServerEngineVersion.VER_15_00_4073_23_V1,
        }),
        configurations: [
          {
            name: "SQLSERVER_BACKUP_RESTORE",
            settings: { IAM_ROLE_ARN: role.roleArn },
          },
        ],
      }
    );

    this.sqlInstance = new rds.DatabaseInstance(
      scope,
      `${sqlStackProps.prefix}-sql-instance`,
      {
        // Multi AZ is not supported for Sql express edition
        multiAz: false,
        credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),
        // Change it to edition of Sql Server you are interested
        engine: rds.DatabaseInstanceEngine.sqlServerEx({
          version: rds.SqlServerEngineVersion.VER_15_00_4073_23_V1,
        }),
        port: sqlStackProps.port,
        // Update to the desired backup days
        backupRetention: cdk.Duration.days(7) as any,
        // The EC2 instance type need to host SQL Server Instance
        // Instance Type should be compatible with SQL Server Editions.
        // For compatible Instance Types, refer https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_SQLServer.html#SQLServer.Concepts.General.InstanceClasses
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.XLARGE
        ) as any,
        vpc: defaultVPC as any,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
        deletionProtection: false,
        securityGroups: [this.securityGroup as any],
        domain: sqlStackProps.domain.ref,
        licenseModel: rds.LicenseModel.LICENSE_INCLUDED,
        optionGroup: optionGroupRDS,
        // Enable Storage if not needed. Make sure compatible sql server edition is set for "engine" parameter
        storageEncrypted: false
      }
    );

    new cdk.CfnOutput(scope, 'sql-instance-id', { value: this.sqlInstance.instanceIdentifier });
    new cdk.CfnOutput(scope, 'sql-instance', { value: this.sqlInstance.dbInstanceEndpointAddress });
    new cdk.CfnOutput(scope, 'sql-instace-security-group', { value: this.securityGroup.securityGroupId });
  }
}