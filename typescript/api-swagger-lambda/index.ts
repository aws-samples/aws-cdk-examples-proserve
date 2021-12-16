import { App, Stack, Fn } from 'aws-cdk-lib';
import { Runtime, Code, Function, CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { AssetApiDefinition, SpecRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class ApiSwaggerLambdaStack extends Stack {
  public readonly bucketName: string;
  constructor(scope: App, id: string) {
    super(scope, id);

    const getItem = new Function(this, 'GetItem', {
      functionName: "GetItem",
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(__dirname, './lambda')),
      handler: 'index.handler'
    });

    getItem.grantInvoke(new ServicePrincipal('apigateway.amazonaws.com'));

    const updateLambdaId = getItem.node.defaultChild as CfnFunction;
    updateLambdaId.overrideLogicalId('GetItem');

    const asset = new Asset(this, 'SwaggerAsset', {
      path: './swagger/swagger.yaml'
    });

    const data = Fn.transform('AWS::Include', {'Location': asset.s3ObjectUrl});

    const swaggerDefinition = AssetApiDefinition.fromInline(data);
    
    new SpecRestApi(this, 'item-api', {
      apiDefinition: swaggerDefinition
    });
  }
}

const app = new App();
new ApiSwaggerLambdaStack(app, 'ApiSwaggerLambdaExample');
app.synth();
