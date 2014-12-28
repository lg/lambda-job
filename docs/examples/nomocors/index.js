var AWS = require('aws-sdk');
AWS.config.update({accessKeyId: "CHANGETHIS", secretAccessKey: "CHANGETHIS", region: "us-west-2"});

var lambdaJobWorker = require('lambda-job');
var lambdaJob = new lambdaJobWorker.LambdaJobWorker(AWS, jobReceived);
exports.handler = lambdaJob.lambdaHandler;

function jobReceived(params, errDataCallback) {
  var request = require('request');
  request({url: params.url}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      errDataCallback(null, body);
    } else {
      errDataCallback(error, null);
    }
  });
}