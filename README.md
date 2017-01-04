# LambdaJob

[![Version npm][version]](http://browsenpm.org/package/lambda-job)[![Version bower][bower]](https://github.com/lg/lambda-job)

[version]: http://img.shields.io/npm/v/lambda-job.svg?style=flat-square
[bower]: https://img.shields.io/bower/v/lambda-job.svg?style=flat-square

** THIS PROJECT IS NO LONGER MAINTAINED -- Amazon has integrated this functionality straight into Lambda! **

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
lambdaJob.invoke("bash", {cmd: "/sbin/ifconfig"}, function (err, output) {
  console.log(output);
});
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

Outputs in the web browser:

```
vsb_20    Link encap:Ethernet  HWaddr 26:3A:68:14:69:21  
          inet addr:192.168.20.21  Bcast:0.0.0.0  Mask:255.255.255.0
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:54 errors:0 dropped:0 overruns:0 frame:0
          TX packets:52 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000 
          RX bytes:23982 (23.4 KiB)  TX bytes:10948 (10.6 KiB)
[...]
```

## Options
- `debugLog`: Turn debug logging on/off. Useful to turn on to see how LambdaJob works. *(default: false)*
- `maxActiveJobs`: Throttle how many jobs can run at once. Note AWS has a hard limit of 25 active jobs at any one point. *(default: 25)*
- `jobTimeout`: The maximum amount of time (in ms) that a job can run for. *(default: 30000)*
- `s3BucketPrefix`: Since we create S3 objects for every desired job, the bucket they're inside of has this prefix. Note that S3 buckets are in a global namespace with other people. *(default: lambda-job-)*
- `sqsQueuePrefix`: Like the s3BucketPrefix except for SQS queues. *(default: lambda-job-)*

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
6. In your Lambda, upload your files to AWS, making sure you included the npm modules you'll need in the archive.
7. Browse to index.html either where you've hosted it, or locally.

## Examples

Before running any of these examples make sure you do the permissions related things above and also change the `CHANGEME` text in the `index.html` and `index.js` files to be your AWS keys.

- *bash* shows how you can run custom binaries on Lambda. It also provides convenient access to explore the Lambda VM and what's available.
- *nomocors* shows how you could use LambdaJob to proxy around CORS restrictions. Great for client-side automation.
- *runcasperjs* shows how you can do web scriping from Lambda.
