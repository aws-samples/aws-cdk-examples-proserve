# ElastiCache Resources with Python CDK!

## Overview
A CDK app for deploying AWS ElastiCache cluster and associated resources. Using this CDK app to deploy 
an AWS ElastiCache cluster with the Replication Group and Cluster mode, with the following features

* Replication group with cluster mode disabled or enabled.
* Log delivery to let you stream [Redis Slowlog][1] to Amazon CloudWatch Logs.
* Data in transit and at rest encryption.
* Authenticate users using auth token or Role-Based Access Control (RBAC) with Redis 6.0 onward. 
All Redis password (token) and Redis User passwords are auto-generated and stored in AWS SecretsManger. 
* [schedule automatic backups][4] through `snapshot_window` and `snapshot_retention_limit`.


## Requirements

* [AWS CDK][5]
* [AWS CLI][2]
* Python >= 3.7

## Supported Redis Versions
AWS ElastiCache supports the following Redis versions, or you can use the AWS ElastiCache CLI to describe the 
supported versions
* 6.x
* 5.0.6

## Security
* Redis 6.x supports not only Redis user through the user group but also Redis token/password.
* Redis 5.x supports only the Redis password.
* Any applications or the AWS ElastiCache clients, with the following permissions granted for the key, 
are expected to retrieve the credentials from AWS SecretsManager first. 
    * "kms:Decrypt",
    * "kms:DescribeKey",
    * "kms:Encrypt",
    * "kms:ReEncrypt*",

##Secret
* Using customized key or the default KMS key already defined for the account and region
* Stored in AWS Secrets Manager

## Unit Test
The unit test cases are defined in tests folder. 

* `test_elasticache_stack.py` - test the ElastiCache stack.

### Command
 * `pytest`          to run the unit test code

## Setup

### Install AWS CDK

The AWS CDK command line is installed via `npm`. You will need to ensure you install the version contained in the `cdk.version` file in this repository. This can be done with the following command.

```
CDK_VERSION=$(cat cdk.version)
npm install cdk@$CDK_VERSION
```

If you want to install it globally (in your home directory), you can add the `-g` option. 
If you want to make the `cdk` command available to all your terminal sessions you'll want to add it to your `$PATH`.

### Install Python Dependencies

For installing Python dependencies, you will want to use a Python virtual environment. You can run the following commands.

```
# Create virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# If you are a Windows platform, you would activate the virtualenv like this:
% .venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```
## Configuration
Amazon ElastiCache replication group can have cluster mode enabled or cluster mode disabled
### cluster mode enabled 
 * `num_node_groups` > 1
 * composed of 1 to 99 shards with each shard has a primary node for write and up to 5 read-only nodes.
 * no data replications across shards.

### cluster mode disabled
 * `num_node_groups` = 1 
 * only one read/write node.
 * read replica node can be promoted to primary read/write node.
  
When create a cluster, you specify the following required items in `config\config.py`  

 * `account_id`          aws account id to deploy to
 * `vpc_id`              id of non-default vpc to deploy to
 * `subnet_ids'          subnet ids in the that are used in ElastiCache subnet group.
 * `allowed_cidrs'       cidrs used in security group to allow connections to ElastiCache cluster.
 * `auth_token_enabled`  indicate to use Redis Auth token or RBAC authentications.
 * `users`               used when `auth_token_enabled` is false to create users in the user group.
   * `user_id`           identity of the user, this need to be unique.
   * `user_name`         the user name.
   * `user_acl`          [user access control list][3]

## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation
 * `cdk destroy`     destroy resources created by CDK app       

Enjoy!

[1]: https://redis.io/commands/slowlog
[2]: https://aws.amazon.com/cli/
[3]: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html
[4]: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/backups-automatic.html
[5]: https://aws.amazon.com/cdk/