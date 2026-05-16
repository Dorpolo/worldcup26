variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch metrics"
  type        = string
}

variable "api_tg_arn_suffix" {
  description = "API target group ARN suffix"
  type        = string
}

variable "agent_tg_arn_suffix" {
  description = "Agent target group ARN suffix"
  type        = string
}

variable "mcp_tg_arn_suffix" {
  description = "MCP target group ARN suffix"
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "alert_email" {
  description = "Email address for alarm notifications"
  type        = string
}
