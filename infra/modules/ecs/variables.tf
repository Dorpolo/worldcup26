variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "account_id" {
  description = "AWS account ID"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for ECS resources"
  type        = string
}

variable "private_subnets" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "ecs_sg_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "desired_count" {
  description = "Desired number of task replicas per service"
  type        = number
  default     = 1
}

variable "app_secret_arn" {
  description = "ARN of the Secrets Manager secret containing app env vars"
  type        = string
  sensitive   = true
}

variable "api_image" {
  description = "Full ECR image URI for the API service"
  type        = string
}

variable "agent_image" {
  description = "Full ECR image URI for the agent service"
  type        = string
}

variable "mcp_image" {
  description = "Full ECR image URI for the MCP service"
  type        = string
}

variable "api_target_group_arn" {
  description = "ALB target group ARN for the API service"
  type        = string
}

variable "agent_target_group_arn" {
  description = "ALB target group ARN for the agent service"
  type        = string
}

variable "mcp_target_group_arn" {
  description = "ALB target group ARN for the MCP service"
  type        = string
}

variable "domain" {
  description = "Root domain (used for constructing internal service URLs)"
  type        = string
}
