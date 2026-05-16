output "alb_dns_name" {
  description = "ALB public DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ALB ARN suffix (used in CloudWatch metrics)"
  value       = aws_lb.main.arn_suffix
}

output "alb_zone_id" {
  description = "ALB Route53 canonical zone ID (for alias records)"
  value       = aws_lb.main.zone_id
}

output "api_target_group_arn" {
  description = "Target group ARN for the API service"
  value       = aws_lb_target_group.service["api"].arn
}

output "agent_target_group_arn" {
  description = "Target group ARN for the agent service"
  value       = aws_lb_target_group.service["agent"].arn
}

output "mcp_target_group_arn" {
  description = "Target group ARN for the MCP service"
  value       = aws_lb_target_group.service["mcp"].arn
}

output "api_tg_arn_suffix" {
  description = "API target group ARN suffix (for CloudWatch)"
  value       = aws_lb_target_group.service["api"].arn_suffix
}

output "agent_tg_arn_suffix" {
  description = "Agent target group ARN suffix (for CloudWatch)"
  value       = aws_lb_target_group.service["agent"].arn_suffix
}

output "mcp_tg_arn_suffix" {
  description = "MCP target group ARN suffix (for CloudWatch)"
  value       = aws_lb_target_group.service["mcp"].arn_suffix
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}
