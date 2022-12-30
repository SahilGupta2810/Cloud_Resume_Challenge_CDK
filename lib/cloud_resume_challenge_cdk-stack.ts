import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as S3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cert from 'aws-cdk-lib/aws-certificatemanager';
import { TargetTrackingScalingPolicy } from 'aws-cdk-lib/aws-applicationautoscaling';
import { DomainName } from 'aws-cdk-lib/aws-apigateway';
import { Domain } from 'domain';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';



export class CloudResumeChallengeCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    //Create and Configure S3 Bucket
    const bucket = new s3.Bucket(this, 'sgupta.cloud',
      {
        bucketName: "sgupta.cloud",
        websiteIndexDocument: "index.html",
        //publicReadAccess: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        versioned: true,
      });

    //Note that after making changes to your Website files like html , css or JS files, 
    //you need to deploy the changes to the bucket before each deployment. With the help of CLI cmd : aws s3 sync folder_name s3://bucket_name
    //I was able to acheive this , but usually it should be automated alog with stack creation / deployment / redeployment
    // BucketDeployment helps in achieving that using cdk. It helps to sync our changes in s3 bucket with the folder we specify.
    new S3Deployment.BucketDeployment(this, "bucket-Deployment", {
      sources: [S3Deployment.Source.asset("./resume-site")],
      destinationBucket: bucket
    });

    //Import Certificate using ACM
    const certificateArn = "arn:aws:acm:us-east-1:160902316896:certificate/de7fe76e-112c-492b-bef5-dab6ff56a520"
    const certificate = cert.Certificate.fromCertificateArn(this, 'CertificateImported', certificateArn);


    //Configure { HostedZone } in Route53
    const zone = new route53.PublicHostedZone(this, 'Hosted-zone', {
      zoneName: 'sgupta.cloud',
      comment: 'The hosted zone is used for resume hosted on AWS'
    });


    // Configure { OAI, Distribution } in CloudFront 


    //Configure CloudFront
    const OAI = new cloudfront.OriginAccessIdentity(this, 'resume_OAI', {
      comment: 'comment'
    }
    );

    // const cfDistribution = new cloudfront.Distribution(this, 'myDistribution-cdk', {
    //   defaultBehavior: {
    //     origin: new origins.S3Origin(bucket),
    //     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //   },
    //   defaultRootObject: "index.html",
    //   certificate: certificate,
    //   domainNames: [zone.zoneName],
    //   //Add Error response
    //});
    const cfWebDistribution = new cloudfront.CloudFrontWebDistribution(this, 'myDistribution-cdk', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: OAI
          },
          behaviors: [
            {
              viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD,
              compress: true,
              isDefaultBehavior: true,
            }
          ]
        }
      ],

    })
    //Create { ARecord , AAAARecord , CNAME Record , ALIAS } in Route53
    const cNameRecord = new route53.CnameRecord(this, 'CnameRecord', {
      zone,
      recordName: 'resume.sgupta.cloud',
      domainName: cfWebDistribution.distributionDomainName
    })


    //Create { ARecord , AAAARecord , CNAME Record , ALIAS } in Route53
    // const cNameRecord = new route53.CnameRecord(this, 'CnameRecord', {
    //   zone,
    //   recordName: 'resume.sgupta.cloud',
    //   domainName: cfDistribution.distributionDomainName
    // })


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
      }
    })

    //Add Method in API Gateway [GET , POST ]

    //Create and configure DyanamoDB Table
    const table = new dynamodb.Table(this, 'Cloud-Resume-Challenge', {
      tableName: 'Cloud-Resume-Challenge',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'ID',
        type: dynamodb.AttributeType.STRING
      }
    })


    //Output 
    // new cdk.CfnOutput(this, "Resources Endpoints", {
    //   value: cfDistribution.distributionDomainName
    // });
    new cdk.CfnOutput(this, "Resources Endpoints", {
      value: cfWebDistribution.distributionDomainName
    });
    new cdk.CfnOutput(this, "OAI", {
      value: OAI.originAccessIdentityId
    });

  }
}
