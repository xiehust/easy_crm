#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EasyCrmStack } from '../lib/easy-crm-stack.js';

const app = new cdk.App();

new EasyCrmStack(app, 'EasyCrmStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
  }
});
