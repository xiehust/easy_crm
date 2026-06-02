import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');

export class EasyCrmStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const cognitoDomainPrefix = new cdk.CfnParameter(this, 'CognitoDomainPrefix', {
      type: 'String',
      default: `easy-crm-${this.node.addr.slice(0, 8).toLowerCase()}`,
      description: 'Globally unique prefix for the Cognito Hosted UI domain.'
    });

    const mcpOAuthCallbackUrls = new cdk.CfnParameter(this, 'McpOAuthCallbackUrls', {
      type: 'CommaDelimitedList',
      default: 'http://localhost:5555/callback/zJW_9JhwgoXA',
      description: 'Comma-delimited OAuth callback URL list for the confidential MCP Cognito app client.'
    });

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { cidrMask: 24, name: 'public', subnetType: ec2.SubnetType.PUBLIC },
        { cidrMask: 24, name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
      ]
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsights: true
    });
    const fargateRuntimePlatform: ecs.RuntimePlatform = {
      cpuArchitecture: ecs.CpuArchitecture.ARM64,
      operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
    };

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(1)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(1)
        }
      ]
    });

    const frontendUrl = `https://${distribution.distributionDomainName}`;
    const mcpResourceUrl = `${frontendUrl}/mcp`;

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true, username: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 10,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const userPoolDomain = userPool.addDomain('HostedUiDomain', {
      cognitoDomain: {
        domainPrefix: cognitoDomainPrefix.valueAsString
      },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN
    });

    const cognitoDomainHost = `${cognitoDomainPrefix.valueAsString}.auth.${Stack.of(this).region}.amazoncognito.com`;

    userPool.addResourceServer('McpResourceServer', {
      identifier: mcpResourceUrl,
      userPoolResourceServerName: 'Easy CRM MCP'
    });

    const userPoolClient = userPool.addClient('WebClient', {
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: false
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: [
          `${frontendUrl}/auth/callback`,
          'http://localhost:5173/auth/callback',
          'http://localhost:5555/callback/zJW_9JhwgoXA'
        ],
        logoutUrls: [frontendUrl, 'http://localhost:5173/']
      },
      preventUserExistenceErrors: true
    });

    const mcpUserPoolClient = userPool.addClient('McpConfidentialClient', {
      userPoolClientName: 'easy-crm-mcp-confidential-client',
      generateSecret: true,
      authFlows: {
        userSrp: true,
        userPassword: false
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: mcpOAuthCallbackUrls.valueAsList
      },
      preventUserExistenceErrors: true
    });

    const webClientBranding = new cognito.CfnManagedLoginBranding(this, 'WebClientManagedLoginBranding', {
      userPoolId: userPool.userPoolId,
      clientId: userPoolClient.userPoolClientId,
      useCognitoProvidedValues: true
    });
    webClientBranding.node.addDependency(userPoolDomain);

    const mcpClientBranding = new cognito.CfnManagedLoginBranding(this, 'McpClientManagedLoginBranding', {
      userPoolId: userPool.userPoolId,
      clientId: mcpUserPoolClient.userPoolClientId,
      useCognitoProvidedValues: true
    });
    mcpClientBranding.node.addDependency(userPoolDomain);

    const dbCredentials = rds.Credentials.fromGeneratedSecret('crm');
    const databaseName = 'easy_crm';
    const dbCluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_17
      }),
      credentials: dbCredentials,
      defaultDatabaseName: databaseName,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 2,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      backup: { retention: Duration.days(3) },
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false
    });

    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const apiService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      publicLoadBalancer: true,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      runtimePlatform: fargateRuntimePlatform,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(rootDir, 'backend'), {
          platform: ecrAssets.Platform.LINUX_ARM64
        }),
        containerPort: 4000,
        environment: {
          PORT: '4000',
          AWS_REGION: Stack.of(this).region,
          COGNITO_USER_POOL_ID: userPool.userPoolId,
          COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
          CORS_ORIGIN: `${frontendUrl},http://localhost:5173`,
          DATABASE_HOST: dbCluster.clusterEndpoint.hostname,
          DATABASE_PORT: '5432',
          DATABASE_NAME: databaseName,
          DATABASE_USER: 'crm',
          RUN_MIGRATIONS: 'true'
        },
        secrets: {
          DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(dbCluster.secret!, 'password')
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'api',
          logGroup: apiLogGroup
        })
      },
      healthCheckGracePeriod: Duration.seconds(90)
    });
    apiService.targetGroup.configureHealthCheck({ path: '/health', healthyHttpCodes: '200' });
    dbCluster.connections.allowDefaultPortFrom(apiService.service);
    distribution.addBehavior('/api/*', new origins.LoadBalancerV2Origin(apiService.loadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
    }), {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    });

    const mcpLogGroup = new logs.LogGroup(this, 'McpLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const mcpService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'PublicMcpService', {
      cluster,
      publicLoadBalancer: true,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      runtimePlatform: fargateRuntimePlatform,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(rootDir, 'mcp-server'), {
          platform: ecrAssets.Platform.LINUX_ARM64
        }),
        containerPort: 4111,
        environment: {
          MCP_TRANSPORT: 'http',
          MCP_PORT: '4111',
          MCP_RESOURCE_URL: mcpResourceUrl,
          AWS_REGION: Stack.of(this).region,
          COGNITO_USER_POOL_ID: userPool.userPoolId,
          COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
          COGNITO_CLIENT_IDS: cdk.Fn.join(',', [
            userPoolClient.userPoolClientId,
            mcpUserPoolClient.userPoolClientId
          ]),
          DATABASE_HOST: dbCluster.clusterEndpoint.hostname,
          DATABASE_PORT: '5432',
          DATABASE_NAME: databaseName,
          DATABASE_USER: 'crm'
        },
        secrets: {
          DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(dbCluster.secret!, 'password')
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'mcp',
          logGroup: mcpLogGroup
        })
      },
      healthCheckGracePeriod: Duration.seconds(60)
    });
    mcpService.targetGroup.configureHealthCheck({ path: '/health', healthyHttpCodes: '200' });
    dbCluster.connections.allowDefaultPortFrom(mcpService.service);
    distribution.addBehavior('/mcp', new origins.LoadBalancerV2Origin(mcpService.loadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
    }), {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    });
    distribution.addBehavior('/.well-known/oauth-protected-resource*', new origins.LoadBalancerV2Origin(mcpService.loadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
    }), {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    });

    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
      sources: [
        s3deploy.Source.asset(path.join(rootDir, 'frontend', 'dist')),
        s3deploy.Source.data(
          'config.js',
          `window.__CRM_CONFIG__ = ${JSON.stringify({
            API_BASE_URL: frontendUrl,
            AWS_REGION: Stack.of(this).region,
            COGNITO_USER_POOL_ID: userPool.userPoolId,
            COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
            COGNITO_DOMAIN: cognitoDomainHost,
            COGNITO_REDIRECT_URI: `${frontendUrl}/auth/callback`,
            COGNITO_LOGOUT_URI: frontendUrl
          })};`
        )
      ]
    });

    new cdk.CfnOutput(this, 'FrontendUrl', { value: frontendUrl });
    new cdk.CfnOutput(this, 'BackendApiUrl', { value: `http://${apiService.loadBalancer.loadBalancerDnsName}` });
    new cdk.CfnOutput(this, 'CognitoUserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'CognitoAppClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'CognitoMcpAppClientId', { value: mcpUserPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'CognitoHostedUiDomain', { value: `https://${cognitoDomainHost}` });
    new cdk.CfnOutput(this, 'CognitoMcpAuthorizeUrl', { value: `https://${cognitoDomainHost}/oauth2/authorize` });
    new cdk.CfnOutput(this, 'CognitoMcpTokenUrl', { value: `https://${cognitoDomainHost}/oauth2/token` });
    new cdk.CfnOutput(this, 'CognitoMcpResourceServerIdentifier', { value: mcpResourceUrl });
    new cdk.CfnOutput(this, 'CognitoMcpClientSecretCommand', {
      value: `aws cognito-idp describe-user-pool-client --region ${Stack.of(this).region} --user-pool-id ${userPool.userPoolId} --client-id ${mcpUserPoolClient.userPoolClientId} --query UserPoolClient.ClientSecret --output text`
    });
    new cdk.CfnOutput(this, 'McpEndpoint', { value: mcpResourceUrl });
    new cdk.CfnOutput(this, 'McpPublicAlbEndpoint', { value: `http://${mcpService.loadBalancer.loadBalancerDnsName}/mcp` });
    new cdk.CfnOutput(this, 'AuroraEndpoint', { value: dbCluster.clusterEndpoint.hostname });
    new cdk.CfnOutput(this, 'DatabaseSecretArn', { value: dbCluster.secret!.secretArn });
  }
}
