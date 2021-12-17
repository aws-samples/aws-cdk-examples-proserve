# How to build/deploy Highly Available AWS infrastructure for traditional ASP .NET Applications with SQL Server Backend
## Description
ASP .NET web applications typically run on Windows Servers and use SQL Server as backend. Many applications use windows file share for storing any long-term data associated with applications like logs, customer forms in pdf or other document formats. This CDK project set up a highly available infrastructure to deploy such applications with ease. 

## Architecture
![image](https://user-images.githubusercontent.com/2126431/141518246-ea071e63-cf6d-432f-bfc4-e15877f1899e.png)

## Architecture Details
VPC with following Subnets
1. 2 Public Subnets in 2 different AZs
2. 2 Private Subnet in 2 different AZs

Managed Active Directory Domain setup with following details:
1. New Active Directory Name : "example.corp.com"
2. Domain Admin User : Admin, Password retrieve from AWS Secrets Manager
3. New Domain User : "web-user", Password retrieve from AWS Secrets Manager
4. Part of Private Subnet 

Windows File Share with following details:
1. SMB File Share with backup
2. Share Volume size is 100GB
3. Add to domain "example.corp.com"
4. Map Z drive of Windows EC2 instances to the smb share. Web applications can access the share using example.corp.com\web-user credentials

Two Windows ec2 instances are setup with following details:
1. Operating System : Windows Server 2019
2.  Part of "example.corp.com" domain
2. Domain user "example.corp.com\web-user" is part of Local Administrator Group.
3. IIS with ASP .NET 4.5
4. SMB File share mapped to  Z:\ drive. Domain user "example.corp.com\web-user" has read/write access to Z:\ drive
5. Imports SSL certificate from S3 Bucket to Certificate Store, which can be used to configure SSL website in IIS
7. Basic website with index.html is hosted in port 90

Autoscaling Group
1. Minimum capacity of 2 instances
2.  Health check checks for index.html at port 90

Application Load Balancer
1. Placed in Public Subnet
2. Configured with https listener at port 443 if SSL Certificate is already imported into AWS Account otherwise configured with http listener at port 80
3. Target Group gets created and configured as ALB's default routing target

SQL RDS Instance
1. Single AZ instance with with SQL Express edition
2. Admin password gets retrieved from AWS Secrets Manager
3. New S3 bucket gets created to store the SQL Server Backup files
4. Configured with BACKUP_RESTORE optional group to enable backup/restore data from S3 bucket

Jump Server
1. Linux server based on Amazon Linux
2. Used to RDP to windows instances
3. Used to connect SQL RDS from Sql Server Management Studio

## Prerequisites:
1. Generate Key Pair from AWS console with the name , <key_name> as in below screenshot. This key is used to connect to ec2 hosts. If this key is missing in AWS Account, entire CDK will fail.  
![image](/iis-smbshare-sqlserver/typescript/Ec2KeyPair.png)

## Parameters to customize the deployment
Edit the following parameters in file, "iis-smbshare-sqlserver/typescript/cdk.json" to customize the deployment.

| Parameter Name  | Description |
| ------------- | ------------- |
| prefix  | This value is prepended to all the resource ids for easier identification. For example,  "dev" prefix gets appended to all resources to easily identify Development Resources |
| existingVpcId  | If resources need to be created in existing vpc, edit this constant value to provide vpc Id from AWS Console |
| keyName | EC2 Key Pair Name from Pre-requisite 1 |
| domainName | Name of the Active Directory Domain created by CDK |
| domainUserName | The new domain user created by CDK. This user is configured as Local Admin for EC2 instances, set as App Pool Identify, set to have read/write access to SMB Share, can be used to connect SQL Instance |
| dbAdminUserName | SQL Server Admin User Name |
|dbAdminPasswordSecretName | The Secret with this constant value gets created in AWS Secrets to store database Admin Password |
| dbPort | SQL  Server Listening Port |
| s3CertificateBucketname | S3 Bucket name in which PFX certificate gets uploaded. This certificate is used to configure HTTPS binding for IIS Website |
| certificateArn | If Https website needs to be configured, then import SSL certificate to AWS Certificate manager and set this constant with the value of certifiate ARN |
| certificatePassword | If Https website needs to be configured, then import SSL certificate to AWS Certificate manager and set this constant with the value of certificate password. If you need any help in importing SSL Certificates in PFX format, please refer https://aws.amazon.com/blogs/security/how-to-import-pfx-formatted-certificates-into-aws-certificate-manager-using-openssl/  |
| iisAppPoolName | IIS App Pool Name to configure for the web application |
| iisbindingHostName | Web site Host Name. Used to configure the IIS Website Binding Host Name |
| webSitePort | Web site Port. Used to configure the IIS Webiste Binding port for the Web application |
| cloudWatchAgentConfigPath | Retrieve the cloudwatch config json file from the path and store the config in Parameter Store under the name "WindowsCloudWatchAgentConfig". This parameter value will be used to configure cloud watch agent on each ec2 instance. Sample cloudwatch_agent_config.json is provided under lib folder. If the value of the parameter is empty string, then CloudWatchAgent won't be configured on EC2 instances |
| s3BuildOutputMsiUri | Set the Code pipeline to generate build output as msi and upload to the S3 bucket. The build output uri should be set below. This msi is used to deploy the code whenever new ec2 spins up by autoscaling group.Use the same msi in Code Deploy to deploy the code whenever new release is getting deployed |

## Deployment
1. Make sure the current folder path is "iis-smbshare-sqlserver/typescript"

2. ./script-deploy.sh <aws_profile>