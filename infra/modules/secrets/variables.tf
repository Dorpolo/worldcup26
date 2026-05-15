variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Upstash Redis URL"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
}

variable "internal_api_key" {
  description = "Internal service-to-service shared secret"
  type        = string
  sensitive   = true
}

variable "cron_secret" {
  description = "Cron endpoint authorisation secret"
  type        = string
  sensitive   = true
}

variable "api_football_key" {
  description = "API-Football RapidAPI key"
  type        = string
  sensitive   = true
}

variable "tavily_api_key" {
  description = "Tavily search API key"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "NextAuth.js secret"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend email API key"
  type        = string
  sensitive   = true
}
