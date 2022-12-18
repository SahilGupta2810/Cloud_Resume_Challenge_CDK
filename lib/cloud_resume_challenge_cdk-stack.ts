import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { BucketAccessControl, StorageClass } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CloudResumeChallengeCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    //Create and Configure S3 Bucket[Attach Bucket policy , Enable Website Hosting]
    
    const bucket = new s3.Bucket(this, 'resume-storage-ap-south-1' , 
    {
      bucketName: "resume-storage-ap-south-1",
      publicReadAccess: true
    } );

  }
}
