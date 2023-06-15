// --== Lambda ==-- //
// sets up our lambda

// information about the built lambda archive
data "local_file" "lambda_archive" {
  filename = "${path.module}/../build/email-forwarder.zip"
}

// create the lambda's log-group
resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name = "/aws/lambda/${local.function_name}"
  retention_in_days = 7
  tags = local.tags
}

// defines the lambda
resource "aws_lambda_function" "email_forwarder_function" {
  filename      = data.local_file.lambda_archive.filename
  function_name = local.function_name
  role          = aws_iam_role.email_forwarder_execution_role.arn
  handler       = "index.handler"
  timeout       = 2 * 60

  source_code_hash = data.local_file.lambda_archive.content_base64sha256

  runtime = "nodejs18.x"
  memory_size = 512
  tags = local.tags

  environment {
    variables = {
      NODE_ENV = var.env
    }
  }

  depends_on = [ aws_cloudwatch_log_group.lambda_log_group ]
}

// adds the sqs trigger to the lambda
resource "aws_lambda_event_source_mapping" "lambda_trigger" {
  event_source_arn = aws_sqs_queue.email_forwarder_queue.arn
  function_name    = aws_lambda_function.email_forwarder_function.arn

  batch_size = 10
  enabled = true
  function_response_types = ["ReportBatchItemFailures"]
}
