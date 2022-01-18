default = {
    "at_rest_encryption_enabled": True,
    "auth_token_enabled": False,
    "automatic_failover": True,
    "engine_version": "5.0.6",
    "family": "redis5.0",
    "log_group_retention_limit": "ONE_MONTH",
    "multi_az": True,
    "node_type": "cache.t3.small",
    "num_cache_nodes": 1,
    "num_node_groups": 1,
    "port_number": 6379,
    "replicas_per_node_group": 1,
    "cmk": False,
    "snapshot_retention_limit": 0,
    "transit_encryption_enabled": True,
    "user_group_id": "elasticache-user-group",
    "user_acl": "on ~* +@all"
}
