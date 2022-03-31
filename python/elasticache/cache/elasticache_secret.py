from aws_cdk.core import Construct
import aws_cdk.aws_iam as iam
import aws_cdk.aws_kms as kms
import json

from aws_cdk import (
    aws_secretsmanager as sm,
    core
)


class ElastiCacheSecret(Construct):
    """
    Class for generate secrets. 
    UserSecret extends from ElastiCacheSecret, it contains username and
    auto-generated password which are stored in AWS SecretsManager.
    
    TokenSecret extends from ElastiCacheSecret, it contains token name and
    auto-generated token which are stored in AWS SecretsManager.
    """
    def __init__(self, scope: core.Construct, construct_id: str, key_id: str, cmk: bool = False, **kwargs) -> None:
        """
        Constructor for ElastiCacheSecret class

        Args:
            scope (core.App):  the app object, all child constructs are defined within this app object.
            construct_id (str): id for the construct which is used to uniquely identify it.
            cmk (bool): flag indicate to use AWS managed CMK (True) or not (False).
        """
        super().__init__(scope, construct_id, **kwargs)
        self.set_kms_key(key_id, cmk)
        self.secret = None

    def set_kms_key(self, key_id: str, cmk: bool) -> None:
        """
        Indicate whether to use the default key or create new key in encrypting the secret in SecretsManager.
        If cmk is False then the default master key that is shared across account are used in encrypting the secret in
        SecretsManager.

        Args:
            key_id:
            cmk: indicate if default key (False) or create new AWS managed CMK key (True) is used in encrypting
            the secret.

        Returns: None
        """
        if cmk is True:
            self.kms_key = kms.Key(self, f"aws-elasticache-kms-key-{id}", alias=f"elasticache/kms/key/{key_id}")
        else:
            self.kms_key = None

    def grant_kms_access(self, principal: iam.AccountPrincipal):
        """
        Method to grant access to the KMS key, this supports both usernames of IAM users and IAM Roles

        Args:
            principal: the aws iam principal to grant access to the kms key.
        """
        if self.kms_key is None:
            return

        self.kms_key.add_to_resource_policy(
            iam.PolicyStatement(
                principals=[principal],
                actions=[
                    "kms:Decrypt",
                    "kms:DescribeKey",
                    "kms:Encrypt",
                    "kms:ReEncrypt*",
                    "kms:GenerateDataKey*"
                ]
            )
        )


class UserSecret(ElastiCacheSecret):
    """
    Class for generate username, password and meanwhile store them in
    AWS SecretsManager.
    """
    def __init__(self, scope: core.Construct, id: str, secret_name: str, user_id: str, 
                 user_name: str, user_acl: str, 
                 cluster_name: str, cmk: bool, **kwargs) -> None:
        """
        Constructor for UserSecret class

        Args:
            scope (core.App):  the app object, all child constructs are defined within this app object.
            construct_id (str): id for the construct which is used to uniquely identify it.
            secret_name (str): the string representing secret name in SecretsManager.
            user_name (str): username associated to the generated password.
        """
        super().__init__(scope, id, user_id, cmk, **kwargs)

        self.secret = sm.Secret(
            self, id,
            secret_name=secret_name,
            description=f"Credentials for user {user_name} on ElastiCache cluster {cluster_name}.",
            generate_secret_string=sm.SecretStringGenerator(
                exclude_characters='$@%*()_+=`~{}|[]\\:";\'?,./',
                secret_string_template=json.dumps({
                    "user-name": user_name,
                    "password": ""
                }),
                generate_string_key="password"
            ),
            encryption_key=self.kms_key
        )
        self.user_id = user_id
        self.user_name = user_name
        self.user_acl = user_acl
        self.password = self.secret.secret_value_from_json('password').to_string()


class TokenSecret(ElastiCacheSecret):
    """
    Class for generate token/code that is associated with a name and 
    meanwhile store them in AWS SecretsManager.
    """
    def __init__(self, scope: core.Construct, id: str, secret_name: str, 
                 cluster_name: str, cmk: bool, **kwargs) -> None:
        """
        Constructor for TokenSecret class

        Args:
            scope (core.App):  the app object, all child constructs are 
            defined within this app object.
            construct_id (str): Id for the construct which is used to 
            uniquely identify it.
            secret_name (str): the string secret name in SecretsManager.
        """
        super().__init__(scope, id, secret_name, cmk, **kwargs)

        self.secret = sm.Secret(
            self, id,
            secret_name=secret_name,
            description=f"Auth token ElastiCache cluster {cluster_name}.",
            generate_secret_string=sm.SecretStringGenerator(
                exclude_characters='$@%*()_+=`~{}|[]\\:";\'?,./',
                secret_string_template=json.dumps({
                    "token": ""
                }),
                generate_string_key="token"
            ),
            encryption_key=self.kms_key
        )
        self.token = self.secret.secret_value_from_json('token').to_string()
