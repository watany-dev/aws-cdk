---
name: aws-cdk-contrib
description: "Assists with contributing to the AWS CDK repository. Use this skill when working on aws-cdk pull requests, creating new constructs, writing integration tests, running linters (awslint, pkglint, ESLint), building packages, or following CDK design guidelines. Covers setup, testing, PR creation, conventional commits, and code coverage requirements."
allowed-tools: Read, Grep, Glob, Bash, WebFetch, WebSearch
---

# AWS CDK Contribution Assistant

A comprehensive skill for contributing to the AWS Cloud Development Kit (aws-cdk) repository.

## Instructions

You are assisting a contributor to the AWS CDK repository. Follow these guidelines:

### 1. Initial Setup Support

When a user needs to set up their environment:

1. **Check Prerequisites**
   - Verify Node.js >= 20.x, Yarn >= 1.19.1, Git LFS installed
   - Confirm Docker or Finch is running
   - Check for .NET SDK >= 8.0.x and Python >= 3.8.0

2. **Guide Through Setup**
   ```bash
   # Clone and install (assuming already forked)
   git lfs install
   yarn install

   # Initial build (for specific module like aws-cdk-lib)
   npx lerna run build --scope=aws-cdk-lib
   ```

3. **Explain Watch Mode**
   - Recommend `yarn watch` for iterative development
   - Explain the benefit of incremental compilation

### 2. Understanding Project Structure

Help users navigate the codebase:

- **Modules Location**: `/workspaces/aws-cdk/packages/aws-cdk-lib/aws-{service}`
- **Integration Tests**: `/workspaces/aws-cdk/packages/@aws-cdk-testing/framework-integ/test/{service}/test/`
- **Key Docs**: `CONTRIBUTING.md`, `DESIGN_GUIDELINES.md`, `INTEGRATION_TESTS.md`

### 3. Design Guidelines Adherence

Before implementing changes, ensure compliance with:

**Construct Levels:**
- **L1 (CFN Resources)**: Auto-generated, named `Cfn*`
- **L2**: Intent-based API with sensible defaults
- **L2.5**: Specialized versions of L2 for common scenarios
- **Patterns**: Multi-resource architectures (being phased out)

**Naming Conventions:**
- Classes: PascalCase
- Properties/Methods: camelCase
- Interfaces (behavioral): `IMyInterface`
- Structs (data): `MyDataStruct`
- Props: `FooProps` (all readonly)

**Props Design:**
- All props must be readonly
- Optional props need `@default` JSDoc tag
- Use strong types, avoid `Token` type
- Prefer flat structure over nesting
- Use enums or enum-like classes

### 4. Creating New Constructs

Guide users through the L2 construct creation process:

1. **Determine if it belongs in aws-cdk-lib**
   - Does it meet L2 definition?
   - Follows design guidelines?
   - Is it a core AWS service (IAM, Lambda, EC2, etc.)?
   - If uncertain, recommend publishing separately first

2. **Structure Requirements**
   - Resource class: `class Foo extends Resource implements IFoo`
   - Interface: `interface IFoo extends IResource`
   - Props: `interface FooProps` (with `@default` tags)
   - Abstract base: `abstract class FooBase extends Resource implements IFoo`

3. **Required Features**
   - Attributes (e.g., `fooArn`, `fooName`) with `@attribute` tag
   - Import methods: `fromFooArn()`, `fromFooAttributes()`
   - Grants (if applicable): implement grant methods
   - Metrics (if applicable): `metric*()` methods
   - Events (if applicable): `on*()` methods

### 5. Testing Strategy

**Unit Tests:**
```bash
cd packages/aws-cdk-lib
yarn test aws-lambda  # Test specific module
npx jest aws-lambda/test/name.test.js  # Specific test
```

**Integration Tests:**

Help users create integration tests in `@aws-cdk-testing/framework-integ/test/`:

```typescript
// Example structure
import * as integ from '@aws-cdk/integ-tests-alpha';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'TestStack');

// Define resources
new lambda.Function(stack, 'MyLambda', { /* ... */ });

// Create test with assertions
const testCase = new integ.IntegTest(app, 'MyTest', {
  testCases: [stack],
});
```

**When Integration Tests Are Required:**
- New features using new CloudFormation resources
- New CloudFormation properties
- Cross-service integrations
- New supported versions (e.g., Aurora MySQL 8)
- Custom resources

**Running Tests:**
```bash
# Build framework-integ first
npx lerna run build --scope=@aws-cdk-testing/framework-integ

# Run integration test
cd packages/@aws-cdk-testing/framework-integ
yarn integ test/aws-lambda/test/integ.lambda.js --update-on-failed
```

### 6. Linting and Code Quality

Run linters before committing:

```bash
# From package directory (e.g., packages/aws-cdk-lib)
yarn lint      # Runs all linters (ESLint, pkglint, awslint)
yarn awslint   # CDK design guidelines
yarn pkglint   # Package.json validation
```

**Common awslint Rules:**
- `resource-class-extends-resource`: Resource must extend Resource
- `construct-ctor`: Constructor signature must be `(scope, id, props)`
- `props-default-doc`: Optional props need `@default` documentation
- `attribute-tag`: Attributes need `@attribute` JSDoc tag

### 7. PR Creation Workflow

Guide through the PR process:

1. **Before Creating PR**
   - Ensure all tests pass (unit + integration)
   - Verify code coverage >= 95%
   - Run all linters
   - Check README examples compile (if modified)

2. **PR Title Format** (Conventional Commits)
   ```
   feat(aws-lambda): add support for ARM64 architecture
   fix(aws-s3): correct bucket encryption defaults
   docs(aws-ecs): improve README examples
   chore(core): update dependencies
   ```

3. **PR Description Template**
   ```markdown
   ## Description
   [What changes and why]

   ## Checklist
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated (if applicable)
   - [ ] README updated (if applicable)
   - [ ] Linters pass (yarn lint)
   - [ ] Code coverage >= 95%

   ## Testing
   [How you verified the changes]

   Closes #[issue-number]
   ```

4. **Breaking Changes**
   - Only allowed in experimental/alpha modules
   - Must be documented at end of PR description:
   ```
   BREAKING CHANGE: Description of what broke
   * **module-name:** Another breaking change

   ---
   *By submitting this pull request, I confirm that my contribution is made under the terms of the Apache-2.0 license*
   ```

### 8. Common Commands Reference

Provide quick reference to frequently used commands:

**Building:**
```bash
npx lerna run build --scope=aws-cdk-lib  # Build single module
yarn watch                                 # Watch mode
npx lerna run build --skip-nx-cache       # Build without cache
```

**Testing:**
```bash
yarn test aws-lambda                      # Unit tests
yarn integ test/aws-lambda/test/integ.lambda.js --update-on-failed  # Integ test
./scripts/run-rosetta.sh                  # Test README examples
```

**Linking (for local testing):**
```bash
cd /path/to/your/cdk/app
/path/to/aws-cdk/link-all.sh
```

### 9. Troubleshooting Common Issues

**Issue: Import errors with JSON modules**
- Solution: Add `"resolveJsonModule": true` to tsconfig.json

**Issue: Stale build artifacts**
```bash
./scripts/clean-stale-files.sh
```

**Issue: Dependency not picked up**
```bash
node_modules/.bin/lerna bootstrap
# Restart watch if running
```

**Issue: VS Code TypeScript errors**
- Solution: F1 > "TypeScript: Restart TS Server"

### 10. Best Practices

Remind users of key principles:

- **Avoid Errors If Possible**: Only fail if user explicitly specifies bad configuration
- **Strong Types**: Use construct interfaces (e.g., `IRole`) not ARNs
- **Documentation**: Copy from official AWS docs when possible
- **Tokens**: Always check `Token.isUnresolved()` before validating values
- **Error Messages**: Clear, actionable, from user's perspective
- **Integration Tests**: Add assertions for cross-service integrations and custom resources

### 11. When to Ask for Help

Suggest reaching out for:
- Major architectural changes → Submit RFC
- Large new features → README-driven development in draft PR
- Uncertain about design → Refer to DESIGN_GUIDELINES.md
- Feature scope unclear → Check existing GitHub issues for community signal

## Examples

### Example 1: Setting Up for First Contribution

**User:** "I want to contribute to AWS CDK. How do I start?"

**Response:**
1. Check prerequisites (Node.js 20+, Yarn, Git LFS, Docker)
2. Fork and clone the repository
3. Run setup commands:
   ```bash
   git lfs install
   yarn install
   npx lerna run build --scope=aws-cdk-lib
   ```
4. Read CONTRIBUTING.md and DESIGN_GUIDELINES.md
5. Find an issue labeled 'good first issue'

### Example 2: Adding a New L2 Property

**User:** "I want to add support for the 'timeout' property to Lambda functions."

**Response:**
1. Check if property exists in CloudFormation spec
2. Add to `FunctionProps` interface with `@default` tag
3. Wire to underlying CFN property in constructor
4. Add/update unit test in `packages/aws-cdk-lib/aws-lambda/test/`
5. Add/update integration test in `@aws-cdk-testing/framework-integ/test/aws-lambda/test/`
6. Update README with example if it's a major feature
7. Run linters: `yarn lint`
8. Create PR with title: `feat(aws-lambda): add support for timeout configuration`

### Example 3: Creating an Integration Test

**User:** "How do I write an integration test for Lambda event source mappings?"

**Response:**
```typescript
// File: packages/@aws-cdk-testing/framework-integ/test/aws-lambda/test/integ.event-source.ts

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';
import * as integ from '@aws-cdk/integ-tests-alpha';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'LambdaEventSourceTest');

const queue = new sqs.Queue(stack, 'Queue');
const fn = new lambda.Function(stack, 'Function', {
  code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200 })'),
  handler: 'index.handler',
  runtime: lambda.Runtime.NODEJS_LATEST,
});

fn.addEventSource(new sources.SqsEventSource(queue));

new integ.IntegTest(app, 'EventSourceTest', {
  testCases: [stack],
});
```

Then run:
```bash
cd packages/@aws-cdk-testing/framework-integ
yarn integ test/aws-lambda/test/integ.event-source.js --update-on-failed
```

### Example 4: Fixing Linter Errors

**User:** "I'm getting awslint errors about missing @default tags."

**Response:**
All optional properties in Props interfaces must have a `@default` JSDoc tag:

```typescript
interface FooProps {
  /**
   * The timeout for the function.
   *
   * @default - no timeout
   */
  readonly timeout?: Duration;
}
```

The `@default` should describe the behavior when the property is not provided, not just say "undefined".

### Example 5: Creating a PR

**User:** "I've finished my changes. How do I create a PR?"

**Response:**
1. Ensure all tests pass: `yarn test`
2. Ensure linters pass: `yarn lint`
3. Check code coverage >= 95%
4. Commit with conventional commit message
5. Push to your fork
6. Create PR with proper title:
   - `feat(module): description` for features
   - `fix(module): description` for bugs
7. Fill out PR description:
   - Explain what and why
   - Link related issue: `Closes #123`
   - Confirm all checklist items
8. Wait for CI to pass and reviewers to respond

## Notes

- Always work from your own fork's branch (not organization-owned)
- Integration tests must use `IntegTest` construct (not legacy patterns)
- Code coverage must be >= 95% (use `/* istanbul ignore next */` sparingly)
- Breaking changes only allowed in experimental/alpha modules
- PR title becomes commit message and appears in CHANGELOG
