#!/usr/bin/env python3

from aws_cdk import core
from config.config import config
from cache.elasticache_stack import ElastiCacheStack

app = core.App()
env = core.Environment(account=str(config["account_id"]), region=config["region"])

stack_name = config['stack_name'].lower()
stack_description = "CDK Managed CF template for deploying ElastiCache."

# Create the ElastiCache stack
ElastiCacheStack(app, stack_name, env=env, description=stack_description)

app.synth()
