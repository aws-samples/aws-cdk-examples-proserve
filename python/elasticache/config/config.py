from aws_cdk import aws_logs as logs

config = {
    "account_id": "############",
    "environment": "dev",
    "region": "us-east-1",
    "stack_name": "ElastiCache-Stack",
    "cluster_name": "elasticache-cluster-name",
    "engine_version": "6.x",
    "vpc_id": "vpc-#################",
    "subnet_ids": [
        "subnet-#################",
        "subnet-#################",
        "subnet-#################"
    ],
    "node_type": "cache.t3.small",
    "port_number": 6379,
    "log_retention": logs.RetentionDays.FIVE_MONTHS,
    "allowed_cidrs": [
        "192.168.0.0/16"
    ],
    "snapshot_window": "20:00-23:00",
    "snapshot_retention_limit": 5,
    "log_group_retention_limit": "ONE_MONTH",
    "at_rest_encryption_enabled": True,
    "transit_encryption_enabled": True,
    "multi_az": True,
    "num_node_groups": 2,
    "replicasPerNodeGroup": 1,
    "automatic_failover": True,
    "secrets": {
        "cmk": True,
        "auth_token_enabled": False,
        "user_group_id": "user-group",
        "users": [
            {
                "user_id": "user-id-1",
                "user_name": "user-name-1",
                "user_acl": "on ~* +@all"
            },
            {
                "user_id": "user-id-2",
                "user_name": "user-name-2",
                "user_acl": "on ~* +@all"
            },
            {
                "user_id": "user-id-3",
                "user_name": "user-name-3",
                "user_acl": "on ~* +@all"
            }
        ]
    }
}