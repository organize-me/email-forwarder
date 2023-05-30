// --== IAM ==-- //
// Defines the execution role for our lambda

data "aws_iam_policy_document" "email_forwarder_execution_policy_doc" {
  statement {
    sid = "CreateLogGroup"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup"
    ]
    resources = [
      "arn:aws:logs:us-west-2:${data.aws_caller_identity.current.account_id}:*"
    ]
  }

  statement {
    sid = "Logger"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:logs:us-west-2:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.function_name}:*"
    ]
  }

  statement {
    sid = "SQS"
    effect = "Allow"
    actions = ["sqs:*"]
    resources = [
      aws_sqs_queue.email_forwarder_queue.arn
    ]
  }

  statement {
    sid = "S3"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:DeleteObject"
    ]
    resources = [
      "${aws_s3_bucket.email_forwarder_s3.arn}/*"
    ]
  }
}

resource "aws_iam_policy" "email_forwarder_execution_policy" {
  name        = "${local.function_name}-policy"
  description = "Email Forwarder"
  path        = "/"
  policy = data.aws_iam_policy_document.email_forwarder_execution_policy_doc.json

  tags = local.tags
}

resource "aws_iam_role" "email_forwarder_execution_role" {
  name        = "${local.function_name}-exerole"
  description = "Email Forwarder"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "email_forwarder_execution_role" {
  role       = aws_iam_role.email_forwarder_execution_role.name
  policy_arn = aws_iam_policy.email_forwarder_execution_policy.arn
}