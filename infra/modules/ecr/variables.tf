variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "services" {
  description = "List of ECR repository names to create"
  type        = list(string)
}
