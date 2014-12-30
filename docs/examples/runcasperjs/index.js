var AWS = require('aws-sdk');
AWS.config.update({accessKeyId: "CHANGETHIS", secretAccessKey: "CHANGETHIS", region: "us-west-2"});

var LambdaJob = require('lambda-job');
var lambdaJob = new LambdaJob.LambdaJobWorker(AWS, jobReceived);
exports.handler = lambdaJob.lambdaHandler;

function jobReceived(params, errDataCallback) {
  var fs = require('fs');

  fs.writeFile("/tmp/script.js", params.script, function(err) {
    if (err) return errDataCallback('Couldnt write script file locally!', null);

    lambdaJob.execHelper("PHANTOMJS_EXECUTABLE=bin/phantomjs bin/casperjs/bin/casperjs /tmp/script.js", function(err, consoleOutput) {
      errDataCallback(err, consoleOutput);
    });
  });
}
