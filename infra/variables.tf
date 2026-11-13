variable "region" {
  description = "AWS region for every resource in this configuration."
  type        = string
  default     = "eu-central-1"
}

variable "cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
  default     = "shopstack"
}

variable "kubernetes_version" {
  description = "Kubernetes minor version for the control plane and nodes."
  type        = string
  default     = "1.35"
}

variable "node_instance_type" {
  description = "EC2 instance type for the worker nodes."
  type        = string
  default     = "t3.medium"
}

variable "node_desired_size" {
  description = "Number of worker nodes to run."
  type        = number
  default     = 2
}