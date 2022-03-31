from typing import List, Dict

from config.default import default
from config.config import config


def get_secret_config() -> dict:
    return config.get('secrets', None)


def get_user_group_id() -> str:
    secret = get_secret_config()
    if (secret is None):
        return None
    else:
        return secret.get('user_group_id', default['user_group_id'])


def get_cmk() -> bool:
    secret = get_secret_config()
    if (secret is None):
        return False
    else:
        return secret.get('cmk', default['cmk'])


def get_transit_encryption() -> bool:
    return config.get('transit_encryption_enabled', default['transit_encryption_enabled'])


def get_at_rest_encryption() -> bool:
    return config.get('at_rest_encryption_enabled', default['at_rest_encryption_enabled'])


def get_auth_token_enabled() -> bool:
    secret = get_secret_config()
    if (secret is None):
        return False
    else:
        return secret.get('auth_token_enabled', default['auth_token_enabled'])


def get_log_group_retention_limit() -> str:
    return config.get('log_group_retention_limit', default['log_group_retention_limit'])


def get_snapshot_window() -> str:
    return config.get('snapshot_window', None)


def get_snapshot_retension_limit() -> int:
    return config.get('snapshot_retention_limit', default['snapshot_retention_limit'])


def get_port_number() -> str:
    return config.get('port_number', default['port_number'])


def get_node_type() -> str:
    return config.get('node_type', default['node_type'])


def get_engine_version() -> str:
    return config.get('engine_version', default['engine_version'])


def get_cluster_name() -> str:
    return f"{config['environment']}-{config['cluster_name']}".lower()


def get_multi_az() -> bool:
    return config.get('multi_az', default['multi_az'])


def get_num_node_groups() -> int:
    return config.get('num_node_groups', default['num_node_groups'])


def get_replicas_per_node_group() -> int:
    return config.get('replicas_per_node_group', default['replicas_per_node_group'])


def get_automatic_failover() -> bool:
    return config.get('automatic_failover', default['automatic_failover'])


def get_user_id(user: Dict) -> str:
    return user.get('user_id', None)


def get_user_name(user: Dict) -> str:
    return user.get('user_name', None)


def get_user_acl(user: Dict) -> str:
    return user.get('user_acl', default['user_acl'])


def get_vpc_id() -> str:
    return config['vpc_id']


def get_allowed_cidrs() -> List:
    return config['allowed_cidrs']


def get_subnet_ids() -> List:
    return config['subnet_ids']
