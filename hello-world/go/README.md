# hello-world in Go
<!--BEGIN STABILITY BANNER-->
---

![Stability: Developer Preview](https://img.shields.io/badge/stability-Developer--Preview-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example is built on Construct Libraries marked "Developer Preview" and may not be updated for latest breaking changes.
>
> It may require additional infrastructure prerequisites that must be created before successful build.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem 
---
<!--END STABILITY BANNER-->

This example is an implementation of the `hello-world` example - written in Go. The code
defines an S3 bucket and specifies that a file should be uploaded into the bucket.

**NOTICE**: Go support is still in Developer Preview. This implies that APIs may
change while we address early feedback from the community. We would love to hear
about your experience through GitHub issues.

## Initial Setup

To prepare the code for execution, and download the dependencies, use the
following command:

```
go mod tidy
```

or:

```
go get github.com/aws/aws-cdk-go/awscdk
```

Once all modules have been downloaded, the unit tests should be executed
with the following command:

```
go test
```

The output should be similar to the following:

```
% go test
PASS
ok  	hello-world	5.114s
```

## Annotations in the code

The code (`hello-world.go`) contains a number of comments which illustrate the
changes added to support creating a bucket and uploading a file. Please refer
to those comments for further details.

## Running the code

Normally, Go code is executed by running the following:

```
go run hello-world.go
```

This will work, but nothing will actually happen. Instead, the following command
should be executed:

```
cdk synth
```

Upon a successful invocation, a new directory will be created. The name
of the directory will be `cdk.out`.

For a description of the `cdk.out` directory contents, please refer to the README
file in the parent directory.

## Deploy the resources

The README file in the parent directory provides non-language-specific instructions
for deploying the CDK resources.


### Review the results

To verify the success of the deployment, list the contents of the newly created S3 bucket:

`aws s3 ls my-happy-bucket-name`

The output should be similar to the following:

```
2021-09-25 16:05:14         12 hello_world.txt
```

Congratulations - the stack has been successfully deployed!

## Clean up

When the infrastructure is no longer needed, consider deleting the resources.
Please refer to the README file in the parent directory for specifics.
