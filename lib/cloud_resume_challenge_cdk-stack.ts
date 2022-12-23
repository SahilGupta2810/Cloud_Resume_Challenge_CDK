import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as S3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import { BucketAccessControl, StorageClass } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { InlineApiDefinition } from 'aws-cdk-lib/aws-apigateway';
import { OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
// ;
// const path = "./resume-site/index.html"

export class CloudResumeChallengeCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    //Create and Configure S3 Bucket
    const bucket = new s3.Bucket(this, 'resume-storage-ap-south-1',
      {
        bucketName: "resume-storage-ap-south-1",
        websiteIndexDocument: "index.html",
        publicReadAccess: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

    new S3Deployment.BucketDeployment(this, "bucket-Deployment", {
      sources: [S3Deployment.Source.asset("./resume-site")],
      destinationBucket: bucket,
    });

    
    //Configure Cloudfront Distribution
    const OAI = new cloudfront.OriginAccessIdentity(this, 'resume_OAI', {
      comment: 'comment'
    }
    );
    const cfDistribution = new cloudfront.Distribution(this, 'myDistribution-cdk', {
      defaultBehavior: { 
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html"
    }); 
    //Configure Route53
    //Enable CORS
    
    new cdk.CfnOutput(this, "Resources Endpoints", {
      value: cfDistribution.distributionDomainName
    });



    

  }
}
