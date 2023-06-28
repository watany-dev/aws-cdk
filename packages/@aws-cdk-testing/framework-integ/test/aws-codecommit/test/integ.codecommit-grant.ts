import { App, CfnOutput, Stack } from 'aws-cdk-lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as iam from 'aws-cdk-lib/aws-iam';

const app = new App();
const stack = new Stack(app, 'aws-codecommit-grant-integ-stack');

const repo = new codecommit.Repository(stack, 'Repo', {
  repositoryName: 'aws-cdk-codecommit-events',
});

const user = new iam.User(stack, 'MyUser');
repo.grantPush(user);
repo.grantPull(user);

new CfnOutput(stack, 'RepositoryArn', {
  value: repo.repositoryArn,
});

new IntegTest(app, 'cdk-ecr-integ-test-grant', {
  testCases: [stack],
});