# AWS CDK Contribution Reference

## Quick Command Cheatsheet

### Setup
```bash
git lfs install                              # Install Git LFS
yarn install                                 # Install dependencies
npx lerna run build --scope=aws-cdk-lib     # Build specific module
```

### Development
```bash
yarn watch                                   # Watch mode (incremental build)
yarn test aws-{service}                      # Run unit tests
yarn lint                                    # Run all linters
yarn awslint                                 # CDK design guidelines linter
yarn pkglint                                 # Package.json linter
```

### Testing
```bash
# Unit tests
yarn test aws-lambda                         # Test specific module
npx jest aws-lambda/test/function.test.js    # Test specific file

# Integration tests
cd packages/@aws-cdk-testing/framework-integ
yarn integ test/aws-lambda/test/integ.lambda.js --update-on-failed

# Rosetta (README examples)
./scripts/run-rosetta.sh
```

### Linking
```bash
# Link local CDK to your app
cd /path/to/your/cdk/app
/path/to/aws-cdk/link-all.sh
```

### Cleanup
```bash
./scripts/clean-stale-files.sh              # Remove stale build artifacts
node_modules/.bin/lerna bootstrap           # Reinstall dependencies
```

## File Locations

### Source Code
- **L2 Constructs**: `/workspaces/aws-cdk/packages/aws-cdk-lib/aws-{service}/`
- **Alpha Packages**: `/workspaces/aws-cdk/packages/@aws-cdk/{package-name}-alpha/`
- **Core Framework**: `/workspaces/aws-cdk/packages/aws-cdk-lib/core/`

### Tests
- **Unit Tests**: `/workspaces/aws-cdk/packages/aws-cdk-lib/aws-{service}/test/`
- **Integration Tests**: `/workspaces/aws-cdk/packages/@aws-cdk-testing/framework-integ/test/{service}/test/`

### Documentation
- **Contributing Guide**: `/workspaces/aws-cdk/CONTRIBUTING.md`
- **Design Guidelines**: `/workspaces/aws-cdk/docs/DESIGN_GUIDELINES.md`
- **Integration Tests Guide**: `/workspaces/aws-cdk/INTEGRATION_TESTS.md`
- **New Constructs Guide**: `/workspaces/aws-cdk/docs/NEW_CONSTRUCTS_GUIDE.md`

### Tools
- **Build Tools**: `/workspaces/aws-cdk/tools/@aws-cdk/cdk-build-tools/`
- **Scripts**: `/workspaces/aws-cdk/scripts/`
- **Linters**: `/workspaces/aws-cdk/tools/@aws-cdk/{pkglint,awslint}/`

## Common Linter Rules

### awslint
- `resource-class-extends-resource` - Resources must extend `Resource`
- `resource-interface-extends-iresource` - Resource interfaces must extend `IResource`
- `construct-ctor` - Constructor must be `(scope: Construct, id: string, props?: FooProps)`
- `props-struct-name` - Props interface must be named `FooProps`
- `props-default-doc` - Optional props need `@default` JSDoc tag
- `attribute-tag` - Attributes need `@attribute` JSDoc tag
- `grant-result` - Grant methods should return `iam.Grant`
- `ref-via-interface` - References should use interfaces (e.g., `IRole`) not classes

### pkglint
Validates package.json structure:
- Dependencies are properly declared
- Scripts follow conventions
- Package metadata is complete

### ESLint
Standard TypeScript/JavaScript linting:
- Config: `tools/@aws-cdk/cdk-build-tools/config/eslintrc.js`
- Can be customized per package with `.eslintrc.js`

## Conventional Commit Types

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat(module):` - New feature
- `fix(module):` - Bug fix
- `docs(module):` - Documentation only
- `refactor(module):` - Code refactoring
- `chore(module):` - Build/tooling changes
- `test(module):` - Test additions/changes
- `perf(module):` - Performance improvements

### Examples
```
feat(aws-lambda): add support for ARM64 architecture
fix(aws-s3): correct bucket encryption defaults
docs(aws-ecs): improve README examples
chore(core): update dependencies
```

## Props Design Checklist

When creating or modifying Props interfaces:

- [ ] All props are `readonly`
- [ ] Optional props have `@default` JSDoc tag
- [ ] Use strong types (avoid `Token`, ARN strings)
- [ ] Props struct is flat (no unnecessary nesting)
- [ ] Naming follows AWS service terminology
- [ ] Units are indicated in property names (e.g., `timeoutSeconds`)
- [ ] Boolean props are positive (e.g., `enableLogging` not `disableLogging`)
- [ ] Enums or enum-like classes for discrete values

### Good Example
```typescript
export interface FunctionProps {
  /**
   * The source code of your Lambda function.
   */
  readonly code: Code;

  /**
   * The name of the method within your code that Lambda calls to execute your function.
   */
  readonly handler: string;

  /**
   * The runtime environment for the Lambda function.
   */
  readonly runtime: Runtime;

  /**
   * The function execution time (in seconds) after which Lambda terminates the function.
   *
   * @default Duration.seconds(3)
   */
  readonly timeout?: Duration;

  /**
   * The amount of memory, in MB, that is allocated to your Lambda function.
   *
   * @default 128
   */
  readonly memorySize?: number;
}
```

## Integration Test Checklist

When creating integration tests:

- [ ] Uses `IntegTest` construct from `@aws-cdk/integ-tests-alpha`
- [ ] Located in `@aws-cdk-testing/framework-integ/test/{service}/test/`
- [ ] File named `integ.{feature-name}.ts`
- [ ] Includes assertions if testing integrations/custom resources
- [ ] Can be run with `yarn integ <test-file> --update-on-failed`
- [ ] Snapshot stored in `.snapshot/` directory
- [ ] Tests the actual functionality, not just CloudFormation template

### When Integration Tests Are Required
1. New features using new CloudFormation resource types
2. New CloudFormation properties (especially complex ones)
3. Cross-service integrations
4. New supported versions (e.g., Aurora MySQL 8)
5. Custom resources
6. Complex VTL/JSON formatting

## PR Creation Checklist

Before creating a pull request:

- [ ] Fork is from personal account (not organization)
- [ ] Branch name is descriptive
- [ ] All unit tests pass (`yarn test`)
- [ ] All integration tests pass (if applicable)
- [ ] All linters pass (`yarn lint`)
- [ ] Code coverage >= 95%
- [ ] README updated (if API changed)
- [ ] README examples compile (Rosetta)
- [ ] PR title follows conventional commits format
- [ ] PR description includes:
  - [ ] What changed and why
  - [ ] How to test the changes
  - [ ] Link to related issue (`Closes #123`)
  - [ ] Breaking changes documented (if applicable)
- [ ] "Allow edits from maintainers" enabled

## Design Guidelines Quick Reference

### Construct Levels

**L1 (CFN Resources)**
- Auto-generated from CloudFormation spec
- Named `Cfn{ResourceName}` (e.g., `CfnBucket`)
- 1:1 mapping to CloudFormation resources
- All properties required unless CloudFormation says optional

**L2**
- Intent-based API
- Sensible defaults
- Strong typing
- Helper methods (grants, metrics, events)
- Named after the resource (e.g., `Bucket`)

**L2.5**
- Specialized versions of L2 for common scenarios
- Examples: `LambdaRestApi`, `NodeJsFunction`
- Must provide significant value over base L2

**Patterns**
- Multi-resource architectures
- Being phased out - prefer separate packages

### Naming Conventions

**Classes**
- PascalCase
- Resource: `Bucket`, `Function`, `Topic`
- Interface: `IBucket`, `IFunction`, `ITopic`

**Properties/Methods**
- camelCase
- Attributes: `bucketArn`, `functionName`
- Grants: `grantRead()`, `grantWrite()`
- Metrics: `metricErrors()`, `metricDuration()`
- Events: `onSuccess()`, `onFailure()`

**Props**
- `{ResourceName}Props`
- All properties `readonly`
- Optional properties have `@default` tag

**Enums**
- PascalCase class name
- UPPER_SNAKE_CASE members
- Example: `Runtime.NODEJS_22_X`

## Troubleshooting Guide

### Issue: Build fails with "Cannot find module"
**Solution:**
```bash
yarn install
node_modules/.bin/lerna bootstrap
```

### Issue: TypeScript errors in VS Code
**Solution:**
- F1 → "TypeScript: Restart TS Server"
- Or reload VS Code window

### Issue: Stale build artifacts
**Solution:**
```bash
./scripts/clean-stale-files.sh
npx lerna run build --scope=aws-cdk-lib --skip-nx-cache
```

### Issue: Integration test fails with "Stack already exists"
**Solution:**
```bash
# Manually delete the stack in AWS Console, or:
cd packages/@aws-cdk-testing/framework-integ
yarn integ test/path/to/integ.test.js --clean
```

### Issue: Code coverage below 95%
**Solution:**
- Add more unit tests
- Use `/* istanbul ignore next */` sparingly for unreachable code
- Check coverage report: `yarn test --coverage`

### Issue: awslint errors
**Solution:**
- Read the error message carefully
- Refer to DESIGN_GUIDELINES.md
- Common fixes:
  - Add `@default` tags to optional props
  - Add `@attribute` tags to resource attributes
  - Ensure constructor signature is correct
  - Ensure classes extend correct base classes

### Issue: Rosetta fails
**Solution:**
- Ensure README code examples are valid TypeScript
- Check for missing imports
- Verify fixtures in `rosetta/` directory
- Run `yarn rosetta:extract --strict` for detailed errors

## Additional Resources

### Documentation
- AWS CDK Developer Guide: https://docs.aws.amazon.com/cdk/latest/guide
- API Reference: https://docs.aws.amazon.com/cdk/api/latest
- Construct Hub: https://constructs.dev
- RFCs: https://github.com/aws/aws-cdk-rfcs

### Community
- GitHub Issues: https://github.com/aws/aws-cdk/issues
- GitHub Discussions: https://github.com/aws/aws-cdk/discussions
- Slack: #aws-cdk on cdk.dev
- Stack Overflow: Tag `aws-cdk`

### Tools
- Projen: https://github.com/projen/projen
- jsii: https://github.com/aws/jsii
- Construct Hub: https://constructs.dev
