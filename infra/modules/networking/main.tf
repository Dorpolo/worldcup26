locals {
  # When ha_nat = true, one EIP/NAT per AZ; otherwise just index 0
  nat_az_keys = var.ha_nat ? var.availability_zones : [var.availability_zones[0]]
}

# ── VPC ───────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "bobby-${var.environment}-vpc"
  }
}

# ── Subnets ───────────────────────────────────────────────────────────────────

resource "aws_subnet" "public" {
  for_each = {
    for idx, az in var.availability_zones :
    az => {
      cidr = var.public_subnet_cidrs[idx]
      az   = az
    }
  }

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = true

  tags = {
    Name = "bobby-${var.environment}-public-${each.key}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  for_each = {
    for idx, az in var.availability_zones :
    az => {
      cidr = var.private_subnet_cidrs[idx]
      az   = az
    }
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = "bobby-${var.environment}-private-${each.key}"
    Tier = "private"
  }
}

# ── Internet Gateway ──────────────────────────────────────────────────────────

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "bobby-${var.environment}-igw"
  }
}

# ── NAT Gateways ──────────────────────────────────────────────────────────────

resource "aws_eip" "nat" {
  for_each = toset(local.nat_az_keys)
  domain   = "vpc"

  tags = {
    Name = "bobby-${var.environment}-nat-eip-${each.key}"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "main" {
  for_each = toset(local.nat_az_keys)

  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = aws_subnet.public[each.key].id

  tags = {
    Name = "bobby-${var.environment}-nat-${each.key}"
  }

  depends_on = [aws_internet_gateway.main]
}

# ── Route Tables ──────────────────────────────────────────────────────────────

# Public: all traffic → IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "bobby-${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

# Private: traffic → NAT Gateway (one per AZ if ha_nat, else shared)
resource "aws_route_table" "private" {
  for_each = aws_subnet.private
  vpc_id   = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.ha_nat ? aws_nat_gateway.main[each.key].id : aws_nat_gateway.main[var.availability_zones[0]].id
  }

  tags = {
    Name = "bobby-${var.environment}-private-rt-${each.key}"
  }
}

resource "aws_route_table_association" "private" {
  for_each       = aws_subnet.private
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private[each.key].id
}

# ── Security Groups ───────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name        = "bobby-${var.environment}-alb-sg"
  description = "Allow HTTP/HTTPS inbound to ALB from the internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bobby-${var.environment}-alb-sg"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "bobby-${var.environment}-ecs-sg"
  description = "Allow inbound from ALB only on service ports"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "API port 4000 from ALB"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Agent port 8000 from ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "MCP port 4001 from ALB"
    from_port       = 4001
    to_port         = 4001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow internal traffic between ECS tasks (service-to-service)
  ingress {
    description = "Internal service-to-service traffic"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bobby-${var.environment}-ecs-sg"
  }
}
