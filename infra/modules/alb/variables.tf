variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnets" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "alb_sg_id" {
  description = "Security group ID for the ALB"
  type        = string
}

variable "domain" {
  description = "Root domain (e.g. bobby.gg or staging.bobby.gg)"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the domain"
  type        = string
}
