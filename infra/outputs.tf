# ── Networking ────────────────────────────────────────────────────────────────

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "nat_gateway_ips" {
  description = "Elastic IPs of NAT Gateways (used for Atlas IP allowlist)"
  value       = module.networking.nat_gateway_ips
}

# ── ECR ───────────────────────────────────────────────────────────────────────

output "ecr_api_url" {
  description = "ECR repository URL for the API service"
  value       = module.ecr.repo_urls["bobby-api"]
}

output "ecr_agent_url" {
  description = "ECR repository URL for the agent service"
  value       = module.ecr.repo_urls["bobby-agent"]
}

output "ecr_mcp_url" {
  description = "ECR repository URL for the MCP service"
  value       = module.ecr.repo_urls["bobby-mcp"]
}

# ── ECS ───────────────────────────────────────────────────────────────────────

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs.cluster_arn
}

# ── ALB ───────────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "ALB public DNS name"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "ALB Route53 zone ID (for alias records)"
  value       = module.alb.alb_zone_id
}

output "api_url" {
  description = "HTTPS URL for the API service"
  value       = "https://api.${var.domain}"
}

output "agent_url" {
  description = "HTTPS URL for the agent service"
  value       = "https://agent.${var.domain}"
}

output "mcp_url" {
  description = "HTTPS URL for the MCP service"
  value       = "https://mcp.${var.domain}"
}

# ── Secrets ───────────────────────────────────────────────────────────────────

output "app_secret_arn" {
  description = "ARN of the Secrets Manager secret containing application env vars"
  value       = module.secrets.app_secret_arn
  sensitive   = true
}

# ── MongoDB Atlas ─────────────────────────────────────────────────────────────

output "atlas_connection_string" {
  description = "MongoDB Atlas SRV connection string (without credentials)"
  value       = mongodbatlas_cluster.main.connection_strings[0].standard_srv
  sensitive   = true
}

# ── Monitoring ────────────────────────────────────────────────────────────────

output "cloudwatch_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=Bobby-${var.environment}"
}

output "sns_alert_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  value       = module.monitoring.sns_topic_arn
}

# ── Vercel ────────────────────────────────────────────────────────────────────

output "vercel_project_id" {
  description = "Vercel project ID"
  value       = vercel_project.bobby.id
}
