# AWS Resources Summary

Deployment source: CloudFormation stack `EasyCrmStack` in `us-east-2`.

| AWS Service | Summary |
|---|---|
| CloudFormation | 1 stack: `EasyCrmStack` |
| S3 | 1 frontend static asset bucket |
| CloudFront | 1 distribution for frontend hosting, `/api/*`, `/mcp`, and MCP OAuth discovery proxying |
| Cognito | 1 user pool, 2 app clients, 1 hosted UI domain |
| ECS Fargate | 1 cluster, 2 services: API and MCP |
| ECR | CDK container asset repository usage for API and MCP images |
| Elastic Load Balancing | 2 public application load balancers: API ALB and MCP ALB |
| RDS / Aurora PostgreSQL | 1 Aurora Serverless v2 cluster, 1 writer instance |
| Secrets Manager | 1 secret: database password |
| CloudWatch Logs | 2 log groups: API and MCP |
| VPC / EC2 Networking | 1 VPC, 4 subnets, 1 internet gateway, 1 NAT gateway, 1 elastic IP, route tables, security groups |
| IAM | Roles and policies for ECS tasks, Lambda custom resources, and deployment operations |
| Lambda | CDK custom resource functions for S3 deployment and bucket cleanup |
| Lambda Layer | 1 AWS CLI layer used by CDK S3 deployment |
| CloudFront OAI | 1 origin access identity for private S3 access |

Not currently used by this stack: API Gateway, Route 53, ACM custom certificate, WAF, ElastiCache, SQS, SNS.
