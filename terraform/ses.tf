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