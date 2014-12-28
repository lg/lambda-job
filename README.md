# LambdaJob

[![Version npm][version]](http://browsenpm.org/package/lambda-job)

[version]: http://img.shields.io/npm/v/lambda-job.svg?style=flat-square

LambdaJob is used to facilitate signaling AWS at start Lambda jobs from the web browser and then receive results in real-time. This makes it easy to scale things like: scraping websites, thumbnail generation of images/videos, running custom binaries, etc. LambdaJob provides convenient event-based methods for the web browser to make Lambda calls and reliably receive results. No backend is needed, public AWS user permissions allow for job creation and result listening.

Currently, creating S3 objects is used for starting Lambdas. Kinesis Streams and DynamoDB Table Stream were tested, but provided little benefit over simply using S3 objects.

Much of the functionality within LambdaJob will likely be implemented by Amazon in future SDK releases of AWS Lambda, so I'll update this library to use their implementation if superior.

## Features

- Simple, event-based interface
- Real-time push-based signaling when Lambda jobs complete
- Support for throttling max active jobs (to stay under the 25 Lambda limit)
- Timeout support should Lambdas not return on time
- Fully usable without a server-side
- Automatic cleanup of S3 objects and SQS queues

## Usage
