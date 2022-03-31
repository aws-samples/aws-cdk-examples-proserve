from aws_cdk import (
    core as cdk,
    aws_elasticache as elasticache,
    aws_ec2 as ec2,
)
from aws_cdk.core import Tags

from config import config_util as config


def get_vpc(scope: cdk.Construct) -> ec2.Vpc:
    """
    Look up and return the none default vpc.

    Args:
        scope: the cdk construct.

    Returns:
        ec2.Vpc: The ec2 VPC object based on the vpc id.
    """
    vpc = ec2.Vpc.from_lookup(
        scope, "vpc", is_default=False, vpc_id=config.get_vpc_id()
    )
    return vpc


def get_security_group(scope: cdk.Construct) -> ec2.SecurityGroup:
    """
    Create and return the security group for the cluster which allows for any ipv4 and configured port number.

    Args:
        scope: the cdk construct.

    Returns:
        ec2.SecurityGroup: The ec2 Security Group object for the cluster.
    """
    cluster_name = config.get_cluster_name()
    vpc = get_vpc(scope)
    security_group = ec2.SecurityGroup(
        scope, "ElastiCacheSecurityGroup",
        vpc=vpc,
        allow_all_outbound=True,
        security_group_name=f"elasticache-sg-{cluster_name}",
        description=f"Security Group for {cluster_name} ElastiCache Cluster",
    )
    Tags.of(security_group).add("Name", f"elasticache-sg-{cluster_name}")

    for allowed_cidr in config.get_allowed_cidrs():
        security_group.add_ingress_rule(
            ec2.Peer.ipv4(allowed_cidr),
            ec2.Port.tcp(config.get_port_number()),
            f"Allows connection to ElastiCache cluster {cluster_name}."
        )
    return security_group


def get_subnet_group(scope: cdk.Construct) -> elasticache.CfnSubnetGroup:
    """
    Create and return the elasticache subnet group.

    Args:
        scope: the cdk construct.


    Returns:
        elasticache.CfnSubnetGroup: The subnet group that contains the subnets in vpc.
    """
    cluster_name = config.get_cluster_name()
    subnet_group = elasticache.CfnSubnetGroup(
        scope, "ElastiCacheSubnetGroup",
        cache_subnet_group_name=f"{cluster_name}-subnet-group",
        description=f"ElastiCache subnet group for {cluster_name}",
        subnet_ids=config.get_subnet_ids()
    )
    return subnet_group
