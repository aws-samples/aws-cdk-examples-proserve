import pytest
from aws_cdk import core

from config.default import default
from config.config import config
from config import config_util as configUtil
from cache.elasticache_stack import ElastiCacheStack


@pytest.fixture
def app():
    return core.App()


@pytest.fixture
def env():
    return core.Environment(account='123456789012', region='us-east-2')


@pytest.fixture
def stack(app, env):
    stack_name = config['stack_name'].lower()
    stack_description = "CDK Managed CF template for deploying ElastiCache."
    return ElastiCacheStack(app, stack_name, env=env, description=stack_description)


def test_synth(stack):
    assert stack.cluster_name == configUtil.get_cluster_name()
    assert isinstance(stack.node, core.ConstructNode)
    assert core.ConstructNode.validate(stack.node) == []


def test_security_group(stack):
    template = core.ConstructNode.synth(stack.node).stacks[0].template
    resources = template["Resources"]

    def start_with(x):
        return x[0].startswith("ElastiCacheSecurityGroup")

    security_group = list(filter(start_with, resources.items()))[0][1]
    assert security_group["Type"] == "AWS::EC2::SecurityGroup"


def test_subnet_group(stack):
    template = core.ConstructNode.synth(stack.node).stacks[0].template
    resources = template["Resources"]

    def start_with(x):
        return x[0].startswith("ElastiCacheSubnetGroup")

    subnet_group = list(filter(start_with, resources.items()))[0][1]
    assert subnet_group["Type"] == "AWS::ElastiCache::SubnetGroup"


def test_parameter_group(stack):
    template = core.ConstructNode.synth(stack.node).stacks[0].template
    resources = template["Resources"]

    def start_with(x):
        return x[0].startswith("ElastiCacheParameterGroup")

    parameter_group = list(filter(start_with, resources.items()))
    assert len(parameter_group) == 0


def test_slow_log_group(stack):
    if config.get('engine_version', default['engine_version']) != "6.x":
        assert True
    else:
        template = core.ConstructNode.synth(stack.node).stacks[0].template
        resources = template["Resources"]

        def start_with(x):
            return x[0].startswith("ElastiCacheCloudWatchLogGroup")

        slowlogGroup = list(filter(start_with, resources.items()))[0][1]
        assert slowlogGroup["Type"] == "AWS::Logs::LogGroup"
        assert slowlogGroup["Properties"]["LogGroupName"] == f"/aws/elasticache/redis-slowlog/{stack.cluster_name}"


def test_user(stack):
    if config.get('engine_version', default['engine_version']) != "6.x":
        assert True
    else:
        template = core.ConstructNode.synth(stack.node).stacks[0].template
        resources = template["Resources"]

        def start_with(x):
            return x[0].startswith("ElastiCacheRedisUser")

        redis_user = list(filter(start_with, resources.items()))[0][1]

        assert redis_user["Type"] == "AWS::ElastiCache::User"
        assert redis_user["Properties"]["UserName"] == config["secrets"]["users"][0]["user_name"]


def test_user_group(stack):
    if config.get('engine_version', default['engine_version']) != "6.x":
        assert True
    else:
        template = core.ConstructNode.synth(stack.node).stacks[0].template
        resources = template["Resources"]

        def start_with(x):
            return x[0].startswith("ElastiCacheRedisUserGroup")

        user_group = list(filter(start_with, resources.items()))[0][1]

        assert user_group["Type"] == "AWS::ElastiCache::UserGroup"
        assert user_group["Properties"]["UserIds"][0] == "default"


def test_node_group(stack):
    template = core.ConstructNode.synth(stack.node).stacks[0].template
    resources = template["Resources"]

    def start_with(x):
        return x[0].startswith("ElastiCacheReplicationGroup")

    replication_group = list(filter(start_with, resources.items()))[0][1]

    assert replication_group["Type"] == "AWS::ElastiCache::ReplicationGroup"
    assert replication_group["Properties"]["NumNodeGroups"] >= 2


def test_replication_group(stack):
    template = core.ConstructNode.synth(stack.node).stacks[0].template
    resources = template["Resources"]

    def start_with(x):
        return x[0].startswith("ElastiCacheReplicationGroup")

    replication_group = list(filter(start_with, resources.items()))[0][1]

    assert replication_group["Type"] == "AWS::ElastiCache::ReplicationGroup"
    assert replication_group["Properties"]["Engine"] == "redis"
    assert replication_group["Properties"]["EngineVersion"] == config["engine_version"]


def test_snap_shot(stack):
    template = core.ConstructNode.synth(stack.node).stacks[0].template
    resources = template["Resources"]

    def start_with(x):
        return x[0].startswith("ElastiCacheReplicationGroup")

    replication_group = list(filter(start_with, resources.items()))[0][1]

    assert replication_group["Type"] == "AWS::ElastiCache::ReplicationGroup"
    assert replication_group["Properties"]["SnapshotWindow"] == config.get('snapshot_window', None)
    assert replication_group["Properties"]["SnapshotRetentionLimit"] == config.get('snapshot_retention_limit',
                                                                                   default['snapshot_retention_limit'])
