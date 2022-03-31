from typing import List

from aws_cdk import core as cdk
from aws_cdk import aws_elasticache as elasticache

from config import config_util as config


def create_user_group(scope: cdk.Construct, user_secrets: List) -> None:
    """
    Create user group for the Replication group.

    Args:
        scope: the cdk construct.
        user_secrets: the username and password configured and generated in SecretManager.

    Returns: None

    """
    # Only Redis 6.x supports the Role-Based Access Control (RBAC) with user and user group.
    # The version prior to 6.x uses Auth Token/Password
    if config.get_engine_version() != "6.x":
        return

    users = create_users(scope, user_secrets)
    if users is None or not users:
        return

    user_ids = ['default']
    for user in users:
        user_ids.append(user.user_id)

    user_group = elasticache.CfnUserGroup(
        scope, "ElastiCacheRedisUserGroup",
        engine="redis",
        user_group_id=config.get_user_group_id(),
        user_ids=user_ids
    )

    for user in users:
        user_group.node.add_dependency(user)

    return user_group


def create_users(scope: cdk.Construct, user_secrets: List) -> List[str]:
    """
    Create the Redis user.
    Note: the default user which is to be backward compatible has already been created by the cluster creation.

    Args:
        scope: the cdk construct.
        user_secrets: dictionary contain the username and password to create.

    Returns: None

    Refer to the following links for description of access string
    https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html
    https://redis.io/topics/acl
    The following gives permissions to the user for all available keys and all available commands.
    """

    # Only Redis 6.x supports the Role-Based Access Control (RBAC) with user and user group.
    # The version prior to 6.x uses Auth Token/Password
    if config.get_engine_version() != "6.x":
        return

    users = []
    for idx, user_secret in enumerate(user_secrets):
        user = elasticache.CfnUser(
            scope, f"ElastiCacheRedisUser-{idx + 1}",
            engine="redis",
            user_id=user_secret.user_id,
            user_name=user_secret.user_name,
            passwords=[user_secret.password],
            access_string=user_secret.user_acl
        )
        user.node.add_dependency(user_secret)
        users.append(user)

    return users
