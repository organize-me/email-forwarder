terraform {
  backend "s3" {
    key    = "email-forwarder/terraform.tfstate"
  }
}

// --== Variables ==-- //
variable "domain" {
  type = string
}

// --== SNS ==-- //
resource "aws_sns_topic" "email_forwarder" {
  name = "${replace(var.domain, ".", "-")}-email-forwarder"
}

// --== SQS ==-- //
resource "aws_sqs_queue" "email_forwarder_dlq" {
  name = "${replace(var.domain, ".", "-")}-email-forwarder-dlq"
}

resource "aws_sqs_queue" "email_forwarder_queue" {
  name                        = "${replace(var.domain, ".", "-")}-email-forwarder"
  delay_seconds               = 90
  max_message_size            = 2048
  message_retention_seconds   = 86400
  receive_wait_time_seconds   = 10
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_forwarder_dlq.arn
    maxReceiveCount     = 4
  })
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
  rule_set_name = "${var.domain}-email-forwarder"
}

resource "aws_ses_active_receipt_rule_set" "email-forwarder-rule-set-active" {
  rule_set_name = aws_ses_receipt_rule_set.email-forwarder-rule-set.rule_set_name
}

resource "aws_ses_receipt_rule" "email-forwarder-rule" {
  name          = "${var.domain}-email-forwarder"
  rule_set_name = aws_ses_receipt_rule_set.email-forwarder-rule-set.rule_set_name
  recipients    = [var.domain]
  enabled       = true
  scan_enabled  = true

  sns_action {
    topic_arn = aws_sns_topic.email_forwarder.arn
    position    = 1
  }
}