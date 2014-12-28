# LambdaJob

[![Version npm][version]](http://browsenpm.org/package/lambda-job)[![Version bower][bower]](https://github.com/lg/lambda-job)

[version]: http://img.shields.io/npm/v/lambda-job.svg?style=flat-square
[bower]: https://img.shields.io/bower/v/lambda-job.svg?style=flat-square

LambdaJob provides real-time invoking and completion detection of AWS Lambda functions from JavaScript on the clientside's web browser. This makes it easy to scale things like: scraping websites, thumbnail generation of images/videos, running custom binaries, etc.

## Features

- Lambdas triggered by S3 Object creation
- Real-time results via SQS long-polling
- No back-end needed, just an AWS account and public IAM permissions
- Low-latency and performance focus throughout
- Maximum job throttling (to stay under the 25 Lambda limit)
- Shared SQS queue per client
- Helper for calling commandline applications on Lambda

## Usage

From the web browser:

```javascript
var lambdaJob = new LambdaJobClient();
lambdaJob.invoke("bash", {cmd: "traceroute www.google.com"}, function (err, output) {
  console.log("Route to Google from AWS:");
  console.log(output);
}
```

The Lambda job:

```javascript
var LambdaJob = require('lambda-job');
var lambdaJob = new LambdaJob.LambdaJobWorker(AWS, jobReceived);
exports.handler = lambdaJob.lambdaHandler;

function jobReceived(params, errDataCallback) {
  console.log("Will run: bash -c " + params.cmd + "...");
  lambdaJob.execHelper(params.cmd, function(err, consoleOutput) {
    errDataCallback(err, consoleOutput);
  }
}
```

## Prerequisites

1. Create an IAM user with the following permissions:

        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Sid": "Stmt1418615018000",
              "Effect": "Allow",
              "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "sqs:CreateQueue",
                "sqs:DeleteQueue",
                "sqs:ReceiveMessage",
                "sqs:SendMessage",
                "sqs:DeleteMessage"
              ],
              "Resource": [
                "arn:aws:s3:::lambda-job-*",
                "arn:aws:sqs:us-west-2:YOURACCOUNTNUM:lambda-job-*"
              ]
            }
          ]
        }
2. Create an S3 bucket named `lambda-job-LAMBDANAME`
3. Add CORS permissions on the S3 bucket. Here's a CORS config sample:

        <?xml version="1.0" encoding="UTF-8"?>
        <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
          <CORSRule>
            <AllowedOrigin>*</AllowedOrigin>
            <AllowedMethod>GET</AllowedMethod>
            <AllowedMethod>POST</AllowedMethod>
            <AllowedMethod>PUT</AllowedMethod>
            <AllowedMethod>DELETE</AllowedMethod>
            <AllowedMethod>HEAD</AllowedMethod>
            <MaxAgeSeconds>3000</MaxAgeSeconds>
            <AllowedHeader>*</AllowedHeader>
          </CORSRule>
        </CORSConfiguration>
4. Create your Lambda and set this S3 bucket as your S3 source. It's recommended to use the full 1024MB of RAM since it seems things are faster this way.
6. In your Lambda, upload your files to AWS, making sure you included the npm module.
7. Browse to index.html either where you've hosted it, or locally.