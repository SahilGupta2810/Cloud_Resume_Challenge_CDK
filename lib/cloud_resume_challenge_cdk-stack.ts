import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as S3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import { BucketAccessControl, StorageClass } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { InlineApiDefinition } from 'aws-cdk-lib/aws-apigateway';
// ;
// const path = "./resume-site/index.html"

export class CloudResumeChallengeCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    
    //Create and Configure S3 Bucket
    const bucket = new s3.Bucket(this, 'resume-storage-ap-south-1' , 
    {
      bucketName: "resume-storage-ap-south-1",
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    } );

    new S3Deployment.BucketDeployment(this, "bucket-Deployment", {
      sources: [S3Deployment.Source.asset("./resume-site")],
      destinationBucket: bucket,
    });

    new cdk.CfnOutput(this, "BucketDomain", {
      value: bucket.bucketWebsiteDomainName,
    });

    //Configure Cloudfront 
    //Configure Route53
    //Enable CORS
    //

  }
}
