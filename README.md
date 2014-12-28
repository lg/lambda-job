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

## Usage

From the web browser:

```javascript
var lambdaJob = new LambdaJobClient();
lambdaJob.invoke("bash", {cmd: "traceroute www.google.com"}, function (err, output) {
  console.log("Route to Google from AWS:");
  console.log(output)
}
```

The Lambda job:

```javascript
var AWS = require('aws-sdk');
AWS.config.update({accessKeyId: "aaa", secretAccessKey: "bbb", region: "us-west-2"});

var LambdaJob = require('lambda-job');
var lambdaJob = new LambdaJob.LambdaJobWorker(AWS, jobReceived);
exports.handler = lambdaJob.lambdaHandler;

function jobReceived(params, errDataCallback) {
  lambdaJob.execHelper(params.cmd, function(err, consoleOutput) {
    errDataCallback(err, consoleOutput);
  }
}
```
