from aws_cdk.core import (
    App,
    CfnOutput,
    Tags,
    Stack
)
from aws_cdk import aws_elasticache as elasticache

from config import config_util as config
from cache.helper import (
    log_group,
    secret,
    user_group,
    vpc
)


class ElastiCacheStack(Stack):
    # Class for the ReplicationGroup stack
    def __init__(self, scope: App, construct_id: str, **kwargs) -> None:
        """
        Constructor for ReplicationStack class

        Args:
            scope (core.App):  the app object, all child constructs are defined within this app object.
            construct_id (str): Id for the construct which is used to uniquely identify it.
        """
        super().__init__(scope, construct_id, **kwargs)

        self.cluster_name = config.get_cluster_name()
        self.transit_encryption = config.get_transit_encryption()

        self.security_group = vpc.get_security_group(self)
        self.subnet_group = vpc.get_subnet_group(self)

        # Only Redis 6.x supports the Redis slow-log delivery
        if config.get_engine_version() != "6.x":
            self.log_delivery_configuration_request = None
        else:
            log_group_name = f"/aws/elasticache/redis-slowlog/{self.cluster_name}"
            self.log_group = log_group.get_log_group(self, log_group_name)
            self.log_delivery_configuration_request = [log_group.get_log_delivery_configuration_request(log_group_name)]

        self.create_cache()
        self.output_cache()

    def create_cache(self) -> None:
        """
        Create the Replication Group cluster.

        Args: None

        Returns: None

        """
        self.user_secrets = secret.get_user_secrets(self)
        if hasattr(self, "user_secrets") and self.user_secrets:
            user_group.create_user_group(self, self.user_secrets)

        if hasattr(self, "user_group"):
            user_group_ids = [config.get_user_group_id()]
        else:
            user_group_ids = None

        self.cluster = elasticache.CfnReplicationGroup(
            self, "ElastiCacheReplicationGroup",
            multi_az_enabled=config.get_multi_az(),
            auth_token=secret.get_auth_token(self),
            at_rest_encryption_enabled=config.get_at_rest_encryption(),
            transit_encryption_enabled=self.transit_encryption,
            cache_node_type=config.get_node_type(),
            engine="redis",
            engine_version=config.get_engine_version(),
            auto_minor_version_upgrade=True,
            port=config.get_port_number(),
            cache_subnet_group_name=self.subnet_group.ref,
            security_group_ids=[self.security_group.security_group_id],
            log_delivery_configurations=self.log_delivery_configuration_request,
            num_node_groups=config.get_num_node_groups(),
            replicas_per_node_group=config.get_replicas_per_node_group(),
            automatic_failover_enabled=config.get_automatic_failover(),
            replication_group_description=f"Replication group for {self.cluster_name}",
            user_group_ids=user_group_ids,
            snapshot_window=config.get_snapshot_window(),
            snapshot_retention_limit=config.get_snapshot_retension_limit(),
            replication_group_id=self.cluster_name
        )
        Tags.of(self.cluster).add("Name", self.cluster_name)

        self.cluster.add_depends_on(self.subnet_group)
        if hasattr(self, "user_group"):
            self.cluster.add_depends_on(self.user_group)

    def output_cache(self):
        """
        Output the CloudFormation stack items for replication group.

        Args: None

        Returns: None

        """
        self.output_security_group()
        self.output_secret()
        self.output_cache_cluster()

    def output_security_group(self) -> None:
        """
        Output security group.

        Args: None

        Returns: None

        """
        separator = ","
        CfnOutput(
            self, "output-security-group",
            value=separator.join(self.cluster.security_group_ids),
            description="Redis security group id for the cluster",
            export_name=f"{self.cluster_name}-security-group-id"
        )

    def output_secret(self) -> None:
        """
        Output user or token secrets if it is configured.

        Args: None

        Returns: None

        """
        if hasattr(self, "user_secrets"):
            for idx, user_secret in enumerate(self.user_secrets):
                CfnOutput(
                    self, f"output-user-secret-name-{idx + 1}",
                    value=user_secret.secret.secret_name,
                    description="Replication group configuration user secret name for cluster",
                    export_name=f"{self.cluster_name}-configuration-user-secret-name-{idx}"
                )

        if hasattr(self, "token_secret"):
            CfnOutput(
                self, "output-token-secret-name",
                value=self.token_secret.secret.secret_name,
                description="Replication group configuration token secret name for cluster",
                export_name=f"{self.cluster_name}-configuration-token-secret-name"
            )

    def output_cache_cluster(self) -> None:
        """
        Output specific CloudFormation stack items for replication group.
        The items are group id, port number, and configuration endpoint.

        Args: None

        Returns: None

        """
        CfnOutput(
            self, "output-port-number",
            value=self.cluster.attr_configuration_end_point_port,
            description="Replication group configuration port for cluster",
            export_name=f"{self.cluster_name}-port-number"
        )
        CfnOutput(
            self, "output-endpoint",
            value=self.cluster.attr_configuration_end_point_address,
            description="Replication group configuration endpoint for cluster",
            export_name=f"{self.cluster_name}-endpoint"
        )
        CfnOutput(
            self, "output-id",
            value=self.cluster.ref,
            description="Replication group id for cluster",
            export_name=f"{self.cluster_name}-id"
        )
