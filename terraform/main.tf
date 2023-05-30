terraform {
  backend "s3" {
    key    = "email-forwarder/terraform.tfstate"
  }
}

// --== Variables ==-- //
variable "domain" {
  type = string
}

variable "env" {
  type = string
  default = "production"
}

locals {
  function_name = "${replace(var.domain, ".", "-")}-email-forwarder-${var.env}"
  tags = {app = "email-forwarder", env = var.env}
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

// --== Route 53 ==-- //
data "aws_route53_zone" "primary" {
  name = "${var.domain}"
}

resource "aws_route53_record" "primary" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = ""
  type    = "MX"
  ttl     = "300"
  records = ["10 inbound-smtp.${data.aws_region.current.name}.amazonaws.com"]
}

// --== S3 ==-- //
resource "aws_s3_bucket" "email_forwarder_s3" {
  bucket = local.function_name
  tags = local.tags
}

resource "aws_s3_bucket_policy" "email_forwarder_s3_policy" {
  bucket = aws_s3_bucket.email_forwarder_s3.id
  policy = data.aws_iam_policy_document.email_forwarder_s3_policy_doc.json
}

data "aws_iam_policy_document" "email_forwarder_s3_policy_doc" {
  statement {
    sid     = "AllowSESPuts"
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.email_forwarder_s3.arn}/*"]

    condition {
      test      = "StringEquals"
      variable  = "AWS:SourceAccount"
      values    = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test      = "StringLike"
      variable  = "AWS:SourceArn"
      values    = ["arn:aws:ses:*"]
    }
  }
}

// --== SNS ==-- //
resource "aws_sns_topic" "email_forwarder" {
  name = local.function_name
  tags = local.tags
}

// --== SQS ==-- //
resource "aws_sqs_queue" "email_forwarder_dlq" {
  name = "${local.function_name}-dlq"
  tags = local.tags
}

resource "aws_sqs_queue" "email_forwarder_queue" {
  name                        = local.function_name
  delay_seconds               = 90
  max_message_size            = 2048
  message_retention_seconds   = 86400
  receive_wait_time_seconds   = 10
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_forwarder_dlq.arn
    maxReceiveCount     = 4
  })

  tags = local.tags
}

data "aws_iam_policy_document" "email_forwarder_queue_policy_doc" {
  statement {
    sid     = "1"
    effect  = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.email_forwarder_queue.arn]

    condition {
      test      = "ArnEquals"
      variable  = "aws:SourceArn"
      values    = [aws_sns_topic.email_forwarder.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "email_forwarder_queue_policy" {
  queue_url = aws_sqs_queue.email_forwarder_queue.id
  policy    = data.aws_iam_policy_document.email_forwarder_queue_policy_doc.json
}

// --== Subscription ==-- //
resource "aws_sns_topic_subscription" "email_forwarder_topic_subscription" {
  topic_arn             = aws_sns_topic.email_forwarder.arn
  endpoint              = aws_sqs_queue.email_forwarder_queue.arn
  protocol              = "sqs"
  raw_message_delivery  = true
}

// --== Email Rules ==-- //
resource "aws_ses_receipt_rule_set" "email-forwarder-rule-set" {
  rule_set_name = local.function_name
}

resource "aws_ses_active_receipt_rule_set" "email-forwarder-rule-set-active" {
  rule_set_name = aws_ses_receipt_rule_set.email-forwarder-rule-set.rule_set_name
}

resource "aws_ses_receipt_rule" "email-forwarder-rule" {
  name          = local.function_name
  rule_set_name = aws_ses_receipt_rule_set.email-forwarder-rule-set.rule_set_name
  recipients    = [var.domain]
  enabled       = true
  scan_enabled  = true

  s3_action {
    bucket_name = aws_s3_bucket.email_forwarder_s3.bucket
    topic_arn = aws_sns_topic.email_forwarder.arn
    position    = 1
  }

  depends_on = [ aws_s3_bucket_policy.email_forwarder_s3_policy ]
}

// --== IAM ==-- //
// create the execution role
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

// --== Lambda ==-- //
data "local_file" "lambda_archive" {
  filename = "${path.module}/../build/email-forwarder.zip"
}

resource "aws_lambda_function" "email_forwarder_function" {
  filename      = data.local_file.lambda_archive.filename
  function_name = local.function_name
  role          = aws_iam_role.email_forwarder_execution_role.arn
  handler       = "index.handler"

  source_code_hash = data.local_file.lambda_archive.content_base64sha256

  runtime = "nodejs16.x"

  environment {
    variables = {
      NODE_ENV = var.env
    }
  }

  tags = local.tags
}

resource "aws_lambda_event_source_mapping" "lambda_trigger" {
  event_source_arn = aws_sqs_queue.email_forwarder_queue.arn
  function_name    = aws_lambda_function.email_forwarder_function.arn

  batch_size = 10
  enabled = true
  function_response_types = ["ReportBatchItemFailures"]
}

