terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

# VPC Configuration
resource "aws_vpc" "finnexusai_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "finnexusai-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "finnexusai_igw" {
  vpc_id = aws_vpc.finnexusai_vpc.id

  tags = {
    Name = "finnexusai-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnets" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.finnexusai_vpc.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "finnexusai-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}