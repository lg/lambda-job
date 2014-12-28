var AWS = require('aws-sdk');
AWS.config.update({accessKeyId: "CHANGETHIS", secretAccessKey: "CHANGETHIS", region: "us-west-2"});

var LambdaJob = require('lambda-job');
var lambdaJob = new LambdaJob.LambdaJobWorker(AWS, jobReceived);
exports.handler = lambdaJob.lambdaHandler;

function jobReceived(params, errDataCallback) {
  console.log("Will run: bash -c " + params.cmd + "...");
  lambdaJob.execHelper(params.cmd, function(err, consoleOutput) {
    errDataCallback(err, consoleOutput);
  });
}
