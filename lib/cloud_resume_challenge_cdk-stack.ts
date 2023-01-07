import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as S3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cfTarget from 'aws-cdk-lib/aws-route53-targets';
import * as cert from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';



export class CloudResumeChallengeCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    //Create and Configure S3 Bucket
    const bucket = new s3.Bucket(this, 'sgupta.cloud',
      {
        bucketName: "sgupta.cloud",
        websiteIndexDocument: "index.html",
        publicReadAccess: true,
        //blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        versioned: false,
      });

    //After making changes to your website files (e.g. html, css, or JS), you need to deploy those changes to your S3 bucket before each deployment. 
    //You can do this manually using the AWS CLI command "aws s3 sync folder_name s3://bucket_name," but it is often more convenient to automate this process using BucketDeployment, a tool provided by CDK that syncs your specified folder with the S3 bucket. 
    //This helps streamline the process of creating, deploying, and redeploying your stack.
    new S3Deployment.BucketDeployment(this, "bucket-Deployment", {
      sources: [S3Deployment.Source.asset("./resume-site")],
      destinationBucket: bucket
    });

    //Import Certificate from Amazon CertificateManager
    const certificateArn = "arn:aws:acm:us-east-1:160902316896:certificate/e55ba472-f1d2-4805-995a-1bd3d1c0a542";
    const certificate = cert.Certificate.fromCertificateArn(this, 'Imported-certificate', certificateArn);
    // const certificate = cert.Certificate.fromCertificateArn(
    //   this, 
    //   'Imported-certificate',
    //   "arn:aws:acm:us-east-1:160902316896:certificate/e55ba472-f1d2-4805-995a-1bd3d1c0a542" );

    const zone = new route53.PublicHostedZone(this, 'Hosted-zone', {
      zoneName: 'sgupta.cloud',
      comment: 'The hosted zone is used by Cloud Resume Challenge CloudFront Distribution'
    });

    //Create a Certificate from Amazon Certificate Manager
    // const certificateArn = new cert.DnsValidatedCertificate(this, 'Certificate', {
    //     domainName: "resume.sgupta.cloud",
    //     hostedZone: zone,
    //     region: 'us-east-1'
    // })

    //Configure { HostedZone } in Route53



    // Configure { OAI, Distribution } in CloudFront 
    const OAI = new cloudfront.OriginAccessIdentity(this, 'Cloud_Resume_OAI', {
      comment: 'The OAI is used for Cloud Resume Challenge OAI'
    }
    );

    //Configure CloudFront
    const cfDistribution = new cloudfront.Distribution(this, 'myDistribution-cdk', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket, {
          originAccessIdentity: OAI,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS
      },
      defaultRootObject: 'index.html',
      certificate: certificate,
      domainNames: [zone.zoneName],
      comment: 'This is the CloudFront Distribution for Cloud Resume Challenge'
    });

    //Create { ARecord , AAAARecord , CNAME Record , ALIAS } in Route53
    // const cNameRecord = new route53.CnameRecord(this, 'CnameRecord', {
    //   zone,
    //   recordName: 'sgupta.cloud',
    //   domainName: cfDistribution.domainName,
    // });
    // new route53.ARecord(this, 'ARecord', {
    //   zone,
    //   recordName: 'sgupta.cloud',
    //   target: route53.RecordTarget.fromAlias(new cdk.aws_route53_targets.CloudFrontTarget()),
    //   comment: 'This is the A Record for Cloud Resume Challenge',



    // })
    new route53.ARecord(this, 'ARecord', {
      zone,
      recordName: 'sgupta.cloud',
      target: route53.RecordTarget.fromAlias(new cfTarget.CloudFrontTarget(cfDistribution)),
    })
    //Restrict access to S3 
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.CanonicalUserPrincipal(OAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
        actions: ['s3:GetObject'],
        resources: [`${bucket.bucketArn}/*`],
      }),
    );


    //Create API Gateway
    const api = new apigateway.RestApi(this, 'cloud-api', {
      restApiName: 'Cloud API',
      description: 'REST API for Cloud Resume Challenge',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS
        // allowCredentials: true
      },
      deployOptions: {
        stageName: 'dev'
      },
      retainDeployments: false
    });

    //Create Lambda 
    // const GetFn = new lambda.Function(this, 'GetFn', {
    //   functionName: 'GetFn', 
    //   runtime: lambda.Runtime.NODEJS_14_X,
    //   code: lambda.Code.fromAsset('lambda/get'),
    //   handler: 'handler.put',
    //   environment: {
    //     'BUCKET_NAME': bucket.bucketName,
    //     'TABLE_NAME': 'Resume-Table'
    //   },
    //   timeout: cdk.Duration.seconds(30)

    // })


    //Add GET Method in API gateway with Lambda Integration

    //Create and configure DyanamoDB Table
    const table = new dynamodb.Table(this, 'Cloud-Resume-Challenge', {
      tableName: 'Cloud-Resume-Challenge',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'ID',
        type: dynamodb.AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })


    //Output 
    new cdk.CfnOutput(this, "Resources Endpoints", {
      value: cfDistribution.distributionDomainName
    });
    new cdk.CfnOutput(this, "OAI", {
      value: OAI.originAccessIdentityId
    });

  }
}
