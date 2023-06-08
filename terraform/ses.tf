// --== Email Rules ==-- //
// Defines the rules for SES when receiving emails

resource "aws_ses_receipt_rule_set" "email-forwarder-rule-set" {
  rule_set_name = local.function_name
}

resource "aws_ses_active_receipt_rule_set" "email-forwarder-rule-set-active" {
  rule_set_name = aws_ses_receipt_rule_set.email-forwarder-rule-set.rule_set_name
}

resource "aws_ses_receipt_rule" "email-forwarder-rule" {
  name          = local.function_name
  rule_set_name = aws_ses_receipt_rule_set.email-forwarder-rule-set.rule_set_name
  recipients    = local.emails
  enabled       = true
  scan_enabled  = true

  s3_action {
    bucket_name = aws_s3_bucket.email_forwarder_s3.bucket
    topic_arn   = aws_sns_topic.email_forwarder.arn
    position    = 1
  }

  stop_action {
    scope       = "RuleSet"
    position    = 2
  }
  depends_on = [ aws_s3_bucket_policy.email_forwarder_s3_policy ]
}

resource "aws_ses_receipt_rule" "bounce-rule" {
  name          = "${local.function_name}-noreply"
  rule_set_name = aws_ses_receipt_rule_set.email-forwarder-rule-set.rule_set_name
  enabled       = true
  scan_enabled  = false
  after         = aws_ses_receipt_rule.email-forwarder-rule.name

  bounce_action {
    message         = "Mailbox does not exist"
    sender          = "noreply@${var.domain}"
    smtp_reply_code = "550"
    status_code     = "5.1.1"
    position        = 1
  }
}
