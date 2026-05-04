# Vazeer Shaik — AWS Cloud Portfolio

Personal portfolio showcasing production-style AWS architectures, serverless systems, and secure cloud patterns, built through hands-on projects and deployed using a fully automated CI/CD pipeline.

---

## Live Deployments

Production (AWS CloudFront):
https://d2z9c3p96xyelf.cloudfront.net/

Backup (GitHub Pages):
https://vazeershaik-aws.github.io/vazeer-portfolio/

---

## Overview

This portfolio is deployed using a cloud-native architecture:

* Amazon S3 (private bucket) as origin
* CloudFront CDN for global content delivery
* Origin Access Control (OAC) for secure access
* GitHub Actions CI/CD pipeline for automated deployments

A single repository is used to deploy the application to both AWS (production) and GitHub Pages (backup).

---

## Architecture

GitHub Repository
→ GitHub Actions (CI/CD)
→ Amazon S3 (Private Bucket)
→ CloudFront (CDN + OAC)
→ End Users

---

## CI/CD Pipeline

On every push to the main branch:

1. Code is pushed to GitHub
2. GitHub Actions workflow is triggered
3. Static files are synced to S3
4. CloudFront cache is invalidated
5. Updated content is served globally

---

## Security Design

* S3 bucket is not publicly accessible
* Access restricted via CloudFront Origin Access Control (OAC)
* IAM policies follow least privilege principle
* AWS credentials are stored securely in GitHub Secrets

---

## Featured Work

### Multi-Tier Architecture

High-availability web architecture with load balancing, auto scaling, and isolated network tiers.

### Event-Driven Architecture

Loosely coupled, serverless event processing with scalable routing and execution.

### Serverless Messaging System

Durable, asynchronous communication using pub/sub and queue-based processing.

---

## Additional Work

* CloudFront Dynamic Content Acceleration
* Threat Hunting with AWS Network Firewall
* VPC Network Access Analyzer
* Security Group Automation (Lambda)

---

## Tech Stack

Cloud: AWS
Core Services: EC2, Application Load Balancer, RDS, Lambda, API Gateway, EventBridge, SNS, SQS, CloudFront, S3
DevOps: GitHub Actions (CI/CD)
Tools: Git, GitHub

---

## Project Structure

* index.html — Main page
* style.css — Styling
* script.js — Functionality
* resume.pdf — Resume
* assets/ — Static resources

---

## Key Highlights

* Fully automated CI/CD pipeline using GitHub Actions
* Secure deployment using private S3 and CloudFront OAC
* Dual deployment strategy using AWS (production) and GitHub Pages (backup)
* Production-ready scalable and cost-efficient architecture

---

## Contact

Email: [vazeershaik.aws@gmail.com](mailto:vazeershaik.aws@gmail.com)
GitHub: https://github.com/VazeerShaik-AWS
LinkedIn: https://linkedin.com/in/yourprofile

---

## Focus

Building scalable, resilient, and cost-optimized cloud systems with production-grade architecture and real-world design patterns.
