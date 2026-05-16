output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.task_execution.arn
}

output "task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.task.arn
}

output "service_arns" {
  description = "Map of service name → ECS service ARN"
  value = {
    api   = aws_ecs_service.api.id
    agent = aws_ecs_service.agent.id
    mcp   = aws_ecs_service.mcp.id
  }
}

output "cloudmap_namespace_id" {
  description = "AWS Cloud Map private namespace ID"
  value       = aws_service_discovery_private_dns_namespace.internal.id
}
