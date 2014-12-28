// LambdaJob 0.10 by Larry Gadea (trivex@gmail.com)

function LambdaJobClient(options) {
  var sqs = new AWS.SQS();
  var s3 = new AWS.S3();

  // If a job in in the queue, it can be either a) creating an sqs queue, b) waiting for another
  // job to create the sqs queue or c) been sent and waiting for a response.
  var jobs = [];           // of jobInfo
  var sqsRecv = null;

  // Default options
  if (options == undefined) options = {}
  var defaults = {
    maxActiveJobs: 25,
    jobTimeout: 40000,
    s3BucketPrefix: "lambda-job-",
    sqsQueuePrefix: "lambda-job-"
  }
  Object.keys(defaults).forEach(function(key) {
    options[key] = (options[key] == undefined) ? defaults[key] : options[key]
  });

  function getRandomId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  function getQueueUrl() {
    return (jobs.length == 0) ? null : jobs[0].queueUrl;
  }

  function getTotalActiveJobs() {
    var activeJobs = 0;
    jobs.forEach(function (job) {
      if (job.queueUrl != null)
        activeJobs += 1;
    });
    return activeJobs;
  }

  function createQueue() {
    var qid = getRandomId();
    sqs.createQueue({QueueName: options.sqsQueuePrefix + qid}, function(err, data) {
      if (err) {
        console.error("Removing all jobs due to SQS queue creation failure: " + err);
        jobs.forEach(function(jobInfo) {
          jobInfo.errDataCallback("Failed to create an SQS queue to run job", null);
        });
        jobs = [];
        return;
      }

      var queueUrl = data["QueueUrl"];
      console.log("Created and listening on queue: " + queueUrl);

      // Start the job that was creating the queue
      jobs.forEach(function(jobInfo) {
        if (jobInfo.queueUrl == "creating")
          invokeJob(jobInfo, queueUrl);
      });

      waitForJobResponses(queueUrl);

      // Incase any other jobs were added while the queue was being created
      invokeWaitingJobs();
    });
  }

  function invokeWaitingJobs() {
    jobs.forEach(function(jobInfo) {
      if (jobInfo.queueUrl != null)
        return;
       
      // Do not invoke job yet if we're at the maximum amount of active jobs
      if (getTotalActiveJobs() >= options.maxActiveJobs)
        return;

      invokeJob(jobInfo, getQueueUrl());
    });
  }

  function invokeJob(jobInfo, queueUrl) {
    jobInfo.queueUrl = queueUrl;
    jobInfo.timeoutTimer = setTimeout(function() { invokeTimeout(jobInfo.iid); }, options.jobTimeout);
    
    console.log("Invoking " + jobInfo.lambdaName + " (" + jobInfo.iid + ") onto " + jobInfo.queueUrl);
    s3.putObject({Bucket: options.s3BucketPrefix + jobInfo.lambdaName, Key: jobInfo.iid + "-request.job", Body: JSON.stringify(jobInfo)}, function(err, data) {
      if (err) {
        processJobResponse(jobInfo, "Failed to create S3 job: " + err, null);
        return;
      }
    });
  }

  function jobIndexFromiid(iid) {
    for (var i = 0; i < jobs.length; i++) {
      if (jobs[i].iid == iid) {
        return i;
      }
    }
    return -1;
  }

  function processJobResponse(jobInfo, err, data) {
    var matchedJobsIndex = jobIndexFromiid(jobInfo.iid);
    if (matchedJobsIndex == -1) {
      // Job result likely arrived after it timedout locally
      console.log("Job response arrived too late: " + jobInfo.iid);
      return;
    }

    // Callback before removing the job such that if the callback creates new jobs
    // they will use the existing SQS queue
    var requestJobInfo = jobs[matchedJobsIndex];
    requestJobInfo.errDataCallback(err, data);

    jobs.splice(matchedJobsIndex, 1);
    if (requestJobInfo.timeoutTimer)
      clearInterval(requestJobInfo.timeoutTimer);

    invokeWaitingJobs();

    // We kill the SQS queue if there are no jobs in it.
    if (jobs.length == 0) {
      console.log("Removing SQS queue " + requestJobInfo.queueUrl);
      if (sqsRecv)
        sqsRecv.abort();
      sqs.deleteQueue({QueueUrl: requestJobInfo.queueUrl}, function(err, data) {});
    }

    // S3 request should be cleaned up too
    s3.deleteObject({Bucket: options.s3BucketPrefix + requestJobInfo.lambdaName, Key: requestJobInfo.iid + "-request.job"}, function(err, data) {});
  }

  function waitForJobResponses(queueUrl) {
    var sqsRecv = sqs.receiveMessage({QueueUrl: queueUrl, WaitTimeSeconds: 20, MaxNumberOfMessages: 10}, function(err, data) {
      sqsRecv = null;

      if (err) {
        console.error("Failed to start receiving from SQS queue: " + err);
        console.info("Killing all jobs");
        jobs.forEach(function(jobInfo) {
          processJobResponse(jobInfo, "Failed to listen on SQS Message queue: " + err, null);
        });
        return;
      }

      data.Messages.forEach(function(message) { 
        sqs.deleteMessage({QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle}, function(err, data) {});
        
        console.log("Response received:");
        console.log(message);

        var responseJobInfo = JSON.parse(message.Body);
        processJobResponse(responseJobInfo, responseJobInfo.responseError, responseJobInfo.responseData);
      });

      if (jobs.length > 0)
        waitForJobResponses(queueUrl);
    });
  }

  function invokeTimeout(iid) {
    console.error("Timeout for job " + iid);
    
    var jobIndex = jobIndexFromiid(iid);
    if (jobIndex == -1) {
      console.error("Job not found? " + iid);
      return;
    }

    // Simulate a response, giving the error of having timed out
    var jobInfo = jobs[jobIndex];
    processJobResponse(jobs[jobIndex], "Timed out waiting for Lambda response", null);
  }

  this.invoke = function(lambdaName, lambdaParams, errDataCallback) {
    var iid = getRandomId();
    console.log("Will be invoking " + lambdaName + " (" + iid + ")");

    var jobInfo = {iid: iid, lambdaName: lambdaName, params: lambdaParams, errDataCallback: errDataCallback};
    jobInfo.queueUrl = null;
    jobs.push(jobInfo);

    // Do not invoke job yet if we're at the maximum amount of active jobs
    if (getTotalActiveJobs() >= options.maxActiveJobs)
      return;

    var queueUrl = getQueueUrl();
    if (!queueUrl) {
      // The SQS queue hasn't already been created. It gets created on demand.
      // After the queue is created, it'll automatically scan the queue list for
      // pending or null queueUrls and do the invokes.
      jobInfo.queueUrl = "creating";
      createQueue();
    
    } else if (queueUrl == "creating") {
      // The SQS queue is still being created. As the job was pushed, it'll be
      // auto-invoked once the queue creation finishes.

    } else {
      // Jobs already running
      invokeJob(jobInfo, queueUrl);
    }
  }
}

/////////////////////////////

var LambdaJobWorker = function(AWS, jobReceivedCallback) {
  var util = require('util');
  var jobInfo = null;

  this.lambdaHandler = function(event, context) {
    console.log("LambdaJob 0.10 by Larry Gadea (trivex@gmail.com)");

    // Check this is a valid job that we can process and get the id. Since this lambda will
    // get called on ANY new objects in a bucket, it's possible the bucket is actually
    // multi-purpose and we should ignore the job
    var bucket, key, id;
    try {
      bucket = event.Records[0].s3.bucket.name;
      key = event.Records[0].s3.object.key;
      id = key.match(/(.+)\-request\.job/)[1];
    } catch (e) {
      return console.error("Couldn't identify event as a LambdaJob: " + util.inspect(event, {showHidden: false, depth: null}));
    }
    console.log("Processing LambdaJob: " + id);

    // Though we have the ID, we need to get the actual job data from S3
    var s3 = new AWS.S3();
    s3.getObject({Bucket: bucket, Key: key}, function(err, data) {
      if (err) return console.error("Failed to download job object: " + util.inspect(err, {showHidden: false, depth: null}));
      jobInfo = JSON.parse(data.Body.toString());
      var queueUrl = jobInfo.queueUrl;

      // Call the user code with the job data. This is where the user would run things
      // like phantomjs, ffmpeg, imagemagick, etc.
      jobReceivedCallback(jobInfo.params, finishJob);
    });
  }

  function finishJob(err, data) {
    console.log("Job has finished " + (err ? "with an error" : "successfully") + ": " + util.inspect(err || data, {showHidden: false, depth: null}));
    jobInfo.responseError = err;
    jobInfo.responseData = data;

    // No need to pass back the params since they could be large and will be useless
    delete jobInfo.params;
    
    // We use SQS to notify the client via SQS's push notification functionality. Note
    // that there's a max size of 256KB for data that's sent back.
    var sqs = new AWS.SQS();    
    sqs.sendMessage({QueueUrl: jobInfo.queueUrl, MessageBody: JSON.stringify(jobInfo)}, function(err, data) {
      if (err) {
        console.error("Failed to send completion SQS message: " + err);
      } else {
        console.log("Successfully sent response");
      }
      
      console.log("LambdaJob completed!");
      awsContext.done(null, null);
    });
  }

  this.execHelper = function(cmd, errDataCallback) {
    var cp = require('child_process');
    
    var output = "";
    console.log("Running command: " + cmd);
    var process = cp.spawn('bash', ['-c', cmd], {});

    process.stdout.on('data', function (data) {
      console.log("> " + data.toString());
      output += data.toString();
    });
    process.stderr.on('data', function (data) {
      console.log("! " + data.toString());
      output += data.toString();
    });
    process.on('close', function (code) {
      if (code != 0) {
        errDataCallback("Process returned code: " + code, output);
      } else {
        errDataCallback(null, output);
      }
    });
  }
}

// To make this module not cause errors for the web browser
if (typeof module !== 'undefined')
  module.exports.LambdaJobWorker = LambdaJobWorker;
