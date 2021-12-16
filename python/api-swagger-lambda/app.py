#!/usr/bin/env python3

from constructs import Construct
from aws_cdk import (
    App, Stack, Fn,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_iam as iam,
    aws_s3_assets as assets,
)


class ApiSwaggerLambdaStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        get_item = _lambda.Function(
            self, 'GetItem',
            runtime=_lambda.Runtime.PYTHON_3_7,
            code=_lambda.Code.from_asset('lambda'),
            handler='index.handler',
        )

        get_item.grant_invoke(grantee=iam.ServicePrincipal('apigateway.amazonaws.com'))

        update_lambda_id = get_item.node.default_child
        update_lambda_id.override_logical_id('GetItem')

        asset = assets.Asset(self, "SwaggerAsset",
            path="swagger/swagger.yaml"
        )

        data = Fn.transform('AWS::Include', {'Location': asset.s3_object_url})

        swagger_definition = apigw.AssetApiDefinition.from_inline(definition=data)

        api = apigw.SpecRestApi(self, 'item-api', 
            api_definition=swagger_definition
        )

        

        # get_item.add_permission('NoAuthLambdaPermission',
        #     principal=iam.ServicePrincipal('apigateway.amazonaws.com'),
        #     action='lambda:InvokeFunction',
        #     source_arn=api.arn_for_execute_api()
        # )


app = App()
ApiSwaggerLambdaStack(app, "api-swagger-lambda")
app.synth()