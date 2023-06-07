// --== Variables ==-- //

// the email domain
variable "domain" {
  type = string
  description = "domain name"
}

// the deployment envoirnment
variable "env" {
  type = string
  default = "production"
  description = "deployment envoirnment"
}

variable "config_directory" {
  type = string
  default = "../config/"
  description = "directory containing your configurations"
  validation {
    condition     = can(regex("^.*/$", var.config_directory))
    error_message = "the config_directory must end with a slash"
  }
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

  config = jsondecode(file("${var.config_directory}${var.env}.json"))
}