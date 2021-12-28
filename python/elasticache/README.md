# ElastiCache Resources with Python CDK!

## Overview
A CDK app for deploying AWS ElastiCache clusters and associated resources. 
Using this CDK app to deploy an AWS ElastiCache cluster with the Replication Group and Cluster enabled.

## Requirements

* [AWS CDK][2]
* AWS CLI
* Python >= 3.7

## Supported Redis Versions
AWS ElastiCache supports the folloeing Redis versions, or you can use the AWS ElastiCache CLI to describe the supported versions
* 6.x
* 5.0.6

## Security
* Redis 6.x supports not only the Redis user through the user group and users as well support the Redis token or in anothe words the Redis password.
* Redus 5.x supports only the Redis password.
* All Redis password (token) and Redis User password are auto-generated and stored in AWS SecretsManger. 
* Any applications or the AWS ElastiCache clients, with the following permissions granted for the key, are expected to retrieve the credentials from AWS SecretsManager first. 
    * "kms:Decrypt",
    * "kms:DescribeKey",
    * "kms:Encrypt",
    * "kms:ReEncrypt*",

##Secret
* Using customized key or the default KMS key already defined for the account and region
* Storing the Secrets Manager secret name
* Specifying the auto-generated secret, e.g. password or token
* Two instances are created, one for user-name/password and another one for token-name/token

## Unit Test
The unit test cases are defined in tests folder. 

* test_elasticache_stack.py - test the ElastiCache stack.

### Command
 * `pytest`          to run the unit test code

## Setup

To work with this repo locally you will need to perform a few setup items which are outlined below.

### Install AWS CDK

The AWS CDK command line is installed via `npm`. You will need to ensure you install the version contained in the `cdk.version` file in this repository. This can be done with the following command.

```
CDK_VERSION=$(cat cdk.version)
npm install cdk@$CDK_VERSION
```

If you want to install it globally (in your home directory), you can add the `-g` option. If you want to make the `cdk` command available to all your terminal sessions you'll want to add it to your `$PATH`.

### Install Python Dependencies

For installing Python dependencies, you will want to use a Python virtual environment. You can run the following commands.

```
# Create virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```
## Configuration

Following are required items in `config.py` that needs to be configured.  

 * `account_id`      aws account id to deploy to
 * `vpc_id`          id of non-default vpc to deploy to
 *  `subnet_ids'     subnet ids in the that are used in ElastiCache subnet group.



## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation
 * `cdk destroy`     destroy resources created by CDK app       
