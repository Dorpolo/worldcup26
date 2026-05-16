# ── Core ─────────────────────────────────────────────────────────────────────

variable "environment" {
  description = "Deployment environment (staging | production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "domain" {
  description = "Root domain for the deployment (e.g. bobby.gg or staging.bobby.gg)"
  type        = string
}

# ── Scaling ───────────────────────────────────────────────────────────────────

variable "ha_nat" {
  description = "When true, deploy one NAT Gateway per AZ (production). When false, a single NAT is used."
  type        = bool
  default     = false
}

variable "desired_count" {
  description = "Desired number of ECS task replicas per service"
  type        = number
  default     = 1
}

# ── MongoDB Atlas ─────────────────────────────────────────────────────────────

variable "atlas_public_key" {
  description = "MongoDB Atlas API public key"
  type        = string
  sensitive   = true
}

variable "atlas_private_key" {
  description = "MongoDB Atlas API private key"
  type        = string
  sensitive   = true
}

variable "atlas_org_id" {
  description = "MongoDB Atlas organisation ID"
  type        = string
}

variable "atlas_project_name" {
  description = "MongoDB Atlas project name"
  type        = string
  default     = "bobby"
}

variable "atlas_tier" {
  description = "Atlas cluster tier (e.g. M10 for staging, M30 for production)"
  type        = string
  default     = "M10"
}

variable "atlas_db_username" {
  description = "MongoDB Atlas database username for the application"
  type        = string
  default     = "bobby_app"
}

variable "atlas_db_password" {
  description = "MongoDB Atlas database user password"
  type        = string
  sensitive   = true
}

# ── Vercel ────────────────────────────────────────────────────────────────────

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team slug or ID (leave empty string for personal accounts)"
  type        = string
  default     = ""
}

# ── Secrets injected into AWS Secrets Manager ─────────────────────────────────

variable "anthropic_api_key" {
  description = "Anthropic API key for the LangGraph agent"
  type        = string
  sensitive   = true
}

variable "internal_api_key" {
  description = "Shared secret for internal service-to-service calls"
  type        = string
  sensitive   = true
}

variable "cron_secret" {
  description = "Secret token authorising cron-triggered endpoints"
  type        = string
  sensitive   = true
}

variable "api_football_key" {
  description = "API-Football (RapidAPI) key for match data"
  type        = string
  sensitive   = true
}

variable "tavily_api_key" {
  description = "Tavily search API key used by the agent"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "NextAuth.js secret (used by web app and exposed to Vercel)"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend email API key"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Upstash Redis connection URL (redis://...)"
  type        = string
  sensitive   = true
}

# ── Monitoring ────────────────────────────────────────────────────────────────

variable "alert_email" {
  description = "Email address that receives CloudWatch alarm notifications"
  type        = string
}

# ── Route53 ───────────────────────────────────────────────────────────────────

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the domain"
  type        = string
}
