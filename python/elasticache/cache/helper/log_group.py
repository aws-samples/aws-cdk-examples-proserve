from aws_cdk import (
    core as cdk,
    aws_elasticache as elasticache,
    aws_logs as logs
)

from config import config_util as config


def get_log_delivery_configuration_request(log_group_name: str) -> \
        elasticache.CfnReplicationGroup.LogDeliveryConfigurationRequestProperty:
    """
    Method to create and return ElastiCache log delivery configuration request.

    Args:
        log_group_name: the CloudWatch group name.

    Returns: elasticache.CfnCacheCluster.LogDeliveryConfigurationRequestProperty

    """
    log_destination_details = elasticache.CfnReplicationGroup.DestinationDetailsProperty(
        cloud_watch_logs_details=elasticache.CfnReplicationGroup.CloudWatchLogsDestinationDetailsProperty(
            log_group=log_group_name
        )
    )
    log_delivery_configuration_request = elasticache.CfnReplicationGroup.LogDeliveryConfigurationRequestProperty(
        log_type="slow-log",
        log_format="json",
        destination_type="cloudwatch-logs",
        destination_details=log_destination_details
    )
    return log_delivery_configuration_request


def get_log_group(scope: cdk.Construct, log_group_name: str) -> logs.LogGroup:
    """
    Return the CloudWatch log group for Redis Slow Logs.

    Args:
        scope: the cdk construct.
        log_group_name: the CloudWatch log group name.
    Returns:
        logs.LogGroup: The CloudWatch log group for the Redis slow log.
    """
    log_group_retention = config.get_log_group_retention_limit()
    log_group = logs.LogGroup(
        scope, "ElastiCacheCloudWatchLogGroup",
        log_group_name=log_group_name,
        removal_policy=cdk.RemovalPolicy.DESTROY,
        retention=logs.RetentionDays(log_group_retention)
    )
    return log_group
