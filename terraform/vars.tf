// --== Variables ==-- //

// the email domain
variable "domain" {
  type = string
}

// the deployment envoirnment
variable "env" {
  type = string
  default = "production"
}

// The current aws region
data "aws_region" "current" {}

// The current aws identity
data "aws_caller_identity" "current" {}

locals {
  // The name of our function
  function_name = "${replace(var.domain, ".", "-")}-email-forwarder-${var.env}"
  
  // Tags to attach to aws resources
  tags = {app = "email-forwarder", env = var.env}
}