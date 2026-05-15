# ── Core ──────────────────────────────────────────────────────────────────────
environment = "staging"
aws_region  = "us-east-1"
domain      = "staging.bobby.gg"

# ── Scaling ───────────────────────────────────────────────────────────────────
ha_nat        = false
desired_count = 1

# ── MongoDB Atlas ─────────────────────────────────────────────────────────────
atlas_tier        = "M10"
atlas_project_name = "bobby"
atlas_db_username = "bobby_app"

# ── Monitoring ────────────────────────────────────────────────────────────────
alert_email = "alerts@bobby.gg"

# ── Sensitive values ─────────────────────────────────────────────────────────
# Do NOT commit real values. Supply these via:
#   terraform apply -var-file=environments/staging.tfvars \
#                   -var="atlas_public_key=$ATLAS_PUBLIC_KEY" \
#                   -var="atlas_private_key=$ATLAS_PRIVATE_KEY" \
#                   ... etc
#
# Or use a secrets backend such as AWS Secrets Manager or Vault,
# or export TF_VAR_* environment variables in CI.
