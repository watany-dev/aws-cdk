import { spawnSync } from 'child_process';
import { Construct } from 'constructs';
import * as ecr from '../../aws-ecr';
import * as ecr_assets from '../../aws-ecr-assets';
import * as iam from '../../aws-iam';
import { IKey } from '../../aws-kms';
import * as s3 from '../../aws-s3';
import * as s3_assets from '../../aws-s3-assets';
import * as cdk from '../../core';
import { UnscopedValidationError, ValidationError } from '../../core/lib/errors';

/**
 * Represents the Lambda Handler Code.
 */
export abstract class Code {
  /**
   * Lambda handler code as an S3 object.
   *
   * Note: If `objectVersion` is not defined, the lambda will not be updated automatically if the code in the bucket is updated.
   * This is because CDK/Cloudformation does not track changes on the source S3 Bucket. It is recommended to either use S3Code.fromAsset() instead or set objectVersion.
   * @param bucket The S3 bucket
   * @param key The object key
   * @param objectVersion Optional S3 object version
   */
  public static fromBucket(bucket: s3.IBucket, key: string, objectVersion?: string): S3Code {
    if (objectVersion === undefined) {
      cdk.Annotations.of(bucket).addWarningV2(
        '@aws-cdk/aws-lambda:codeFromBucketObjectVersionNotSpecified',
        'objectVersion is not defined for S3Code.fromBucket(). The lambda will not be updated automatically if the code in the bucket is updated. ' +
        'This is because CDK/Cloudformation does not track changes on the source S3 Bucket. It is recommended to either use S3Code.fromAsset() instead or set objectVersion.',
      );
    }

    return new S3Code(bucket, key, objectVersion);
  }

  /**
   * Lambda handler code as an S3 object.
   *
   * Note: If `options.objectVersion` is not defined, the lambda will not be updated automatically if the code in the bucket is updated.
   * This is because CDK/Cloudformation does not track changes on the source S3 Bucket. It is recommended to either use S3Code.fromAsset() instead or set objectVersion.
   * @param bucket The S3 bucket
   * @param key The object key
   * @param options Optional parameters for setting the code, current optional parameters to set here are
   * 1. `objectVersion` to set S3 object version
   * 2. `sourceKMSKey` to set KMS Key for encryption of code
   */
  public static fromBucketV2 (bucket: s3.IBucket, key: string, options?: BucketOptions): S3CodeV2 {
    if (options?.objectVersion === undefined) {
      cdk.Annotations.of(bucket).addWarningV2(
        '@aws-cdk/aws-lambda:codeFromBucketObjectVersionNotSpecified',
        'options.objectVersion is not defined for S3Code.fromBucketV2(). The lambda will not be updated automatically if the code in the bucket is updated. ' +
        'This is because CDK/Cloudformation does not track changes on the source S3 Bucket. It is recommended to either use S3Code.fromAsset() instead or set options.objectVersion.',
      );
    }

    return new S3CodeV2(bucket, key, options);
  }

  /**
   * DEPRECATED
   * @deprecated use `fromBucket`
   */
  public static bucket(bucket: s3.IBucket, key: string, objectVersion?: string): S3Code {
    return this.fromBucket(bucket, key, objectVersion);
  }

  /**
   * Inline code for Lambda handler
   * @returns `LambdaInlineCode` with inline code.
   * @param code The actual handler code (the resulting zip file cannot exceed 4MB)
   */
  public static fromInline(code: string): InlineCode {
    return new InlineCode(code);
  }

  /**
   * DEPRECATED
   * @deprecated use `fromInline`
   */
  public static inline(code: string): InlineCode {
    return this.fromInline(code);
  }

  /**
   * Loads the function code from a local disk path.
   *
   * @param path Either a directory with the Lambda code bundle or a .zip file
   */
  public static fromAsset(path: string, options?: s3_assets.AssetOptions): AssetCode {
    return new AssetCode(path, options);
  }

  /**
   * Runs a command to build the code asset that will be used.
   *
   * @param output Where the output of the command will be directed, either a directory or a .zip file with the output Lambda code bundle
   * * For example, if you use the command to run a build script (e.g., [ 'node', 'bundle_code.js' ]), and the build script generates a directory `/my/lambda/code`
   * containing code that should be ran in a Lambda function, then output should be set to `/my/lambda/code`
   * @param command The command which will be executed to generate the output, for example, [ 'node', 'bundle_code.js' ]
   * @param options options for the custom command, and other asset options -- but bundling options are not allowed.
   */
  public static fromCustomCommand(
    output: string,
    command: string[],
    options?: CustomCommandOptions,
  ): AssetCode {
    if (command.length === 0) {
      throw new UnscopedValidationError('command must contain at least one argument. For example, ["node", "buildFile.js"].');
    }

    const cmd = command[0];
    const commandArguments = command.splice(1);

    const proc = options?.commandOptions === undefined
      ? spawnSync(cmd, commandArguments) // use the default spawnSyncOptions
      : spawnSync(cmd, commandArguments, options.commandOptions);

    if (proc.error) {
      throw new UnscopedValidationError(`Failed to execute custom command: ${proc.error}`);
    }
    if (proc.status !== 0) {
      throw new UnscopedValidationError(`${command.join(' ')} exited with status: ${proc.status}\n\nstdout: ${proc.stdout?.toString().trim()}\n\nstderr: ${proc.stderr?.toString().trim()}`);
    }

    return new AssetCode(output, options);
  }

  /**
   * Loads the function code from an asset created by a Docker build.
   *
   * By default, the asset is expected to be located at `/asset` in the
   * image.
   *
   * @param path The path to the directory containing the Docker file
   * @param options Docker build options
   */
  public static fromDockerBuild(path: string, options: DockerBuildAssetOptions = {}): AssetCode {
    let imagePath = options.imagePath ?? '/asset/.';

    // ensure imagePath ends with /. to copy the **content** at this path
    if (imagePath.endsWith('/')) {
      imagePath = `${imagePath}.`;
    } else if (!imagePath.endsWith('/.')) {
      imagePath = `${imagePath}/.`;
    }

    const assetPath = cdk.DockerImage
      .fromBuild(path, options)
      .cp(imagePath, options.outputPath);

    return new AssetCode(assetPath);
  }

  /**
   * DEPRECATED
   * @deprecated use `fromAsset`
   */
  public static asset(path: string): AssetCode {
    return this.fromAsset(path);
  }

  /**
   * Creates a new Lambda source defined using CloudFormation parameters.
   *
   * @returns a new instance of `CfnParametersCode`
   * @param props optional construction properties of `CfnParametersCode`
   */
  public static fromCfnParameters(props?: CfnParametersCodeProps): CfnParametersCode {
    return new CfnParametersCode(props);
  }

  /**
   * DEPRECATED
   * @deprecated use `fromCfnParameters`
   */
  public static cfnParameters(props?: CfnParametersCodeProps): CfnParametersCode {
    return this.fromCfnParameters(props);
  }

  /**
   * Use an existing ECR image as the Lambda code.
   * @param repository the ECR repository that the image is in
   * @param props properties to further configure the selected image
   */
  public static fromEcrImage(repository: ecr.IRepository, props?: EcrImageCodeProps) {
    return new EcrImageCode(repository, props);
  }

  /**
   * Create an ECR image from the specified asset and bind it as the Lambda code.
   * @param directory the directory from which the asset must be created
   * @param props properties to further configure the selected image
   */
  public static fromAssetImage(directory: string, props: AssetImageCodeProps = {}) {
    return new AssetImageCode(directory, props);
  }

  /**
   * Determines whether this Code is inline code or not.
   *
   * @deprecated this value is ignored since inline is now determined based on the
   * the `inlineCode` field of `CodeConfig` returned from `bind()`.
   */
  public abstract readonly isInline: boolean;

  /**
   * Called when the lambda or layer is initialized to allow this object to bind
   * to the stack, add resources and have fun.
   *
   * @param scope The binding scope. Don't be smart about trying to down-cast or
   * assume it's initialized. You may just use it as a construct scope.
   */
  public abstract bind(scope: Construct): CodeConfig;

  /**
   * Called after the CFN function resource has been created to allow the code
   * class to bind to it. Specifically it's required to allow assets to add
   * metadata for tooling like SAM CLI to be able to find their origins.
   */
  public bindToResource(_resource: cdk.CfnResource, _options?: ResourceBindOptions) {
    return;
  }
}

/**
 * Result of binding `Code` into a `Function`.
 */
export interface CodeConfig {
  /**
   * The location of the code in S3 (mutually exclusive with `inlineCode` and `image`).
   * @default - code is not an s3 location
   */
  readonly s3Location?: s3.Location;

  /**
   * Inline code (mutually exclusive with `s3Location` and `image`).
   * @default - code is not inline code
   */
  readonly inlineCode?: string;

  /**
   * Docker image configuration (mutually exclusive with `s3Location` and `inlineCode`).
   * @default - code is not an ECR container image
   */
  readonly image?: CodeImageConfig;

  /**
   * The ARN of the KMS key used to encrypt the handler code.
   * @default - the default server-side encryption with Amazon S3 managed keys(SSE-S3) key will be used.
   */
  readonly sourceKMSKeyArn?: string;
}

/**
 * Result of the bind when an ECR image is used.
 */
export interface CodeImageConfig {
  /**
   * URI to the Docker image.
   */
  readonly imageUri: string;

  /**
   * Specify or override the CMD on the specified Docker image or Dockerfile.
   * This needs to be in the 'exec form', viz., `[ 'executable', 'param1', 'param2' ]`.
   * @see https://docs.docker.com/engine/reference/builder/#cmd
   * @default - use the CMD specified in the docker image or Dockerfile.
   */
  readonly cmd?: string[];

  /**
   * Specify or override the ENTRYPOINT on the specified Docker image or Dockerfile.
   * An ENTRYPOINT allows you to configure a container that will run as an executable.
   * This needs to be in the 'exec form', viz., `[ 'executable', 'param1', 'param2' ]`.
   * @see https://docs.docker.com/engine/reference/builder/#entrypoint
   * @default - use the ENTRYPOINT in the docker image or Dockerfile.
   */
  readonly entrypoint?: string[];

  /**
   * Specify or override the WORKDIR on the specified Docker image or Dockerfile.
   * A WORKDIR allows you to configure the working directory the container will use.
   * @see https://docs.docker.com/engine/reference/builder/#workdir
   * @default - use the WORKDIR in the docker image or Dockerfile.
   */
  readonly workingDirectory?: string;
}

/**
 * Lambda code from an S3 archive.
 */
export class S3Code extends Code {
  public readonly isInline = false;
  private bucketName: string;

  constructor(bucket: s3.IBucket, private key: string, private objectVersion?: string) {
    super();

    if (!bucket.bucketName) {
      throw new ValidationError('bucketName is undefined for the provided bucket', bucket);
    }

    this.bucketName = bucket.bucketName;
  }

  public bind(_scope: Construct): CodeConfig {
    return {
      s3Location: {
        bucketName: this.bucketName,
        objectKey: this.key,
        objectVersion: this.objectVersion,
      },
    };
  }
}

/**
 * Lambda code from an S3 archive. With option to set KMSKey for encryption.
 */
export class S3CodeV2 extends Code {
  public readonly isInline = false;
  private bucketName: string;

  constructor(bucket: s3.IBucket, private key: string, private options?: BucketOptions) {
    super();
    if (!bucket.bucketName) {
      throw new ValidationError('bucketName is undefined for the provided bucket', bucket);
    }

    this.bucketName = bucket.bucketName;
  }

  public bind(_scope: Construct): CodeConfig {
    return {
      s3Location: {
        bucketName: this.bucketName,
        objectKey: this.key,
        objectVersion: this.options?.objectVersion,
      },
      sourceKMSKeyArn: this.options?.sourceKMSKey?.keyArn,
    };
  }
}

/**
 * Lambda code from an inline string.
 */
export class InlineCode extends Code {
  public readonly isInline = true;

  constructor(private code: string) {
    super();

    if (code.length === 0) {
      throw new UnscopedValidationError('Lambda inline code cannot be empty');
    }
  }

  public bind(_scope: Construct): CodeConfig {
    return {
      inlineCode: this.code,
    };
  }
}

/**
 * Lambda code from a local directory.
 */
export class AssetCode extends Code {
  public readonly isInline = false;
  private asset?: s3_assets.Asset;

  /**
   * @param path The path to the asset file or directory.
   */
  constructor(public readonly path: string, private readonly options: s3_assets.AssetOptions = { }) {
    super();
  }

  public bind(scope: Construct): CodeConfig {
    // If the same AssetCode is used multiple times, retain only the first instantiation.
    if (!this.asset) {
      this.asset = new s3_assets.Asset(scope, 'Code', {
        path: this.path,
        deployTime: true,
        ...this.options,
      });
    } else if (cdk.Stack.of(this.asset) !== cdk.Stack.of(scope)) {
      throw new ValidationError(`Asset is already associated with another stack '${cdk.Stack.of(this.asset).stackName}'. ` +
        'Create a new Code instance for every stack.', scope);
    }

    if (!this.asset.isZipArchive) {
      throw new ValidationError(`Asset must be a .zip file or a directory (${this.path})`, scope);
    }

    return {
      s3Location: {
        bucketName: this.asset.s3BucketName,
        objectKey: this.asset.s3ObjectKey,
      },
      sourceKMSKeyArn: this.options.sourceKMSKey?.keyArn,
    };
  }

  public bindToResource(resource: cdk.CfnResource, options: ResourceBindOptions = { }) {
    if (!this.asset) {
      throw new ValidationError('bindToResource() must be called after bind()', resource);
    }

    const resourceProperty = options.resourceProperty || 'Code';

    // https://github.com/aws/aws-cdk/issues/1432
    this.asset.addResourceMetadata(resource, resourceProperty);
  }
}

export interface ResourceBindOptions {
  /**
   * The name of the CloudFormation property to annotate with asset metadata.
   * @see https://github.com/aws/aws-cdk/issues/1432
   * @default Code
   */
  readonly resourceProperty?: string;
}

/**
 * Construction properties for `CfnParametersCode`.
 */
export interface CfnParametersCodeProps {
  /**
   * The CloudFormation parameter that represents the name of the S3 Bucket
   * where the Lambda code will be located in.
   * Must be of type 'String'.
   *
   * @default a new parameter will be created
   */
  readonly bucketNameParam?: cdk.CfnParameter;

  /**
   * The CloudFormation parameter that represents the path inside the S3 Bucket
   * where the Lambda code will be located at.
   * Must be of type 'String'.
   *
   * @default a new parameter will be created
   */
  readonly objectKeyParam?: cdk.CfnParameter;
  /**
   * The ARN of the KMS key used to encrypt the handler code.
   * @default - the default server-side encryption with Amazon S3 managed keys(SSE-S3) key will be used.
   */
  readonly sourceKMSKey?: IKey;
}

/**
 * Lambda code defined using 2 CloudFormation parameters.
 * Useful when you don't have access to the code of your Lambda from your CDK code, so you can't use Assets,
 * and you want to deploy the Lambda in a CodePipeline, using CloudFormation Actions -
 * you can fill the parameters using the `#assign` method.
 */
export class CfnParametersCode extends Code {
  public readonly isInline = false;
  private _bucketNameParam?: cdk.CfnParameter;
  private _objectKeyParam?: cdk.CfnParameter;
  private _sourceKMSKey?: IKey;

  constructor(props: CfnParametersCodeProps = {}) {
    super();

    this._bucketNameParam = props.bucketNameParam;
    this._objectKeyParam = props.objectKeyParam;
    this._sourceKMSKey = props.sourceKMSKey;
  }

  public bind(scope: Construct): CodeConfig {
    if (!this._bucketNameParam) {
      this._bucketNameParam = new cdk.CfnParameter(scope, 'LambdaSourceBucketNameParameter', {
        type: 'String',
      });
    }

    if (!this._objectKeyParam) {
      this._objectKeyParam = new cdk.CfnParameter(scope, 'LambdaSourceObjectKeyParameter', {
        type: 'String',
      });
    }

    return {
      s3Location: {
        bucketName: this._bucketNameParam.valueAsString,
        objectKey: this._objectKeyParam.valueAsString,
      },
      sourceKMSKeyArn: this._sourceKMSKey?.keyArn,
    };
  }

  /**
   * Create a parameters map from this instance's CloudFormation parameters.
   *
   * It returns a map with 2 keys that correspond to the names of the parameters defined in this Lambda code,
   * and as values it contains the appropriate expressions pointing at the provided S3 location
   * (most likely, obtained from a CodePipeline Artifact by calling the `artifact.s3Location` method).
   * The result should be provided to the CloudFormation Action
   * that is deploying the Stack that the Lambda with this code is part of,
   * in the `parameterOverrides` property.
   *
   * @param location the location of the object in S3 that represents the Lambda code
   */
  public assign(location: s3.Location): { [name: string]: any } {
    const ret: { [name: string]: any } = {};
    ret[this.bucketNameParam] = location.bucketName;
    ret[this.objectKeyParam] = location.objectKey;
    return ret;
  }

  public get bucketNameParam(): string {
    if (this._bucketNameParam) {
      return this._bucketNameParam.logicalId;
    } else {
      throw new UnscopedValidationError('Pass CfnParametersCode to a Lambda Function before accessing the bucketNameParam property');
    }
  }

  public get objectKeyParam(): string {
    if (this._objectKeyParam) {
      return this._objectKeyParam.logicalId;
    } else {
      throw new UnscopedValidationError('Pass CfnParametersCode to a Lambda Function before accessing the objectKeyParam property');
    }
  }
}

/**
 * Properties to initialize a new EcrImageCode
 */
export interface EcrImageCodeProps {
  /**
   * Specify or override the CMD on the specified Docker image or Dockerfile.
   * This needs to be in the 'exec form', viz., `[ 'executable', 'param1', 'param2' ]`.
   * @see https://docs.docker.com/engine/reference/builder/#cmd
   * @default - use the CMD specified in the docker image or Dockerfile.
   */
  readonly cmd?: string[];

  /**
   * Specify or override the ENTRYPOINT on the specified Docker image or Dockerfile.
   * An ENTRYPOINT allows you to configure a container that will run as an executable.
   * This needs to be in the 'exec form', viz., `[ 'executable', 'param1', 'param2' ]`.
   * @see https://docs.docker.com/engine/reference/builder/#entrypoint
   * @default - use the ENTRYPOINT in the docker image or Dockerfile.
   */
  readonly entrypoint?: string[];

  /**
   * Specify or override the WORKDIR on the specified Docker image or Dockerfile.
   * A WORKDIR allows you to configure the working directory the container will use.
   * @see https://docs.docker.com/engine/reference/builder/#workdir
   * @default - use the WORKDIR in the docker image or Dockerfile.
   */
  readonly workingDirectory?: string;

  /**
   * The image tag to use when pulling the image from ECR.
   * @default 'latest'
   * @deprecated use `tagOrDigest`
   */
  readonly tag?: string;

  /**
   * The image tag or digest to use when pulling the image from ECR (digests must start with `sha256:`).
   * @default 'latest'
   */
  readonly tagOrDigest?: string;

}

/**
 * Represents a Docker image in ECR that can be bound as Lambda Code.
 */
export class EcrImageCode extends Code {
  public readonly isInline: boolean = false;

  constructor(private readonly repository: ecr.IRepository, private readonly props: EcrImageCodeProps = {}) {
    super();
  }

  public bind(_scope: Construct): CodeConfig {
    this.repository.grantPull(new iam.ServicePrincipal('lambda.amazonaws.com'));

    return {
      image: {
        imageUri: this.repository.repositoryUriForTagOrDigest(this.props?.tagOrDigest ?? this.props?.tag ?? 'latest'),
        cmd: this.props.cmd,
        entrypoint: this.props.entrypoint,
        workingDirectory: this.props.workingDirectory,
      },
    };
  }
}

/**
 * Properties to initialize a new AssetImage
 */
export interface AssetImageCodeProps extends ecr_assets.DockerImageAssetOptions {
  /**
   * Specify or override the CMD on the specified Docker image or Dockerfile.
   * This needs to be in the 'exec form', viz., `[ 'executable', 'param1', 'param2' ]`.
   * @see https://docs.docker.com/engine/reference/builder/#cmd
   * @default - use the CMD specified in the docker image or Dockerfile.
   */
  readonly cmd?: string[];

  /**
   * Specify or override the ENTRYPOINT on the specified Docker image or Dockerfile.
   * An ENTRYPOINT allows you to configure a container that will run as an executable.
   * This needs to be in the 'exec form', viz., `[ 'executable', 'param1', 'param2' ]`.
   * @see https://docs.docker.com/engine/reference/builder/#entrypoint
   * @default - use the ENTRYPOINT in the docker image or Dockerfile.
   */
  readonly entrypoint?: string[];

  /**
   * Specify or override the WORKDIR on the specified Docker image or Dockerfile.
   * A WORKDIR allows you to configure the working directory the container will use.
   * @see https://docs.docker.com/engine/reference/builder/#workdir
   * @default - use the WORKDIR in the docker image or Dockerfile.
   */
  readonly workingDirectory?: string;
}

/**
 * Represents an ECR image that will be constructed from the specified asset and can be bound as Lambda code.
 */
export class AssetImageCode extends Code {
  public readonly isInline: boolean = false;
  private asset?: ecr_assets.DockerImageAsset;

  constructor(private readonly directory: string, private readonly props: AssetImageCodeProps) {
    super();
  }

  public bind(scope: Construct): CodeConfig {
    // If the same AssetImageCode is used multiple times, retain only the first instantiation.
    if (!this.asset) {
      this.asset = new ecr_assets.DockerImageAsset(scope, 'AssetImage', {
        directory: this.directory,
        ...this.props,
      });
      this.asset.repository.grantPull(new iam.ServicePrincipal('lambda.amazonaws.com'));
    } else if (cdk.Stack.of(this.asset) !== cdk.Stack.of(scope)) {
      throw new ValidationError(`Asset is already associated with another stack '${cdk.Stack.of(this.asset).stackName}'. ` +
        'Create a new Code instance for every stack.', scope);
    }

    return {
      image: {
        imageUri: this.asset.imageUri,
        entrypoint: this.props.entrypoint,
        cmd: this.props.cmd,
        workingDirectory: this.props.workingDirectory,
      },
    };
  }

  public bindToResource(resource: cdk.CfnResource, options: ResourceBindOptions = { }) {
    if (!this.asset) {
      throw new ValidationError('bindToResource() must be called after bind()', resource);
    }

    const resourceProperty = options.resourceProperty || 'Code.ImageUri';

    // https://github.com/aws/aws-cdk/issues/14593
    this.asset.addResourceMetadata(resource, resourceProperty);
  }
}

/**
 * Options when creating an asset from a Docker build.
 */
export interface DockerBuildAssetOptions extends cdk.DockerBuildOptions {
  /**
   * The path in the Docker image where the asset is located after the build
   * operation.
   *
   * @default /asset
   */
  readonly imagePath?: string;

  /**
   * The path on the local filesystem where the asset will be copied
   * using `docker cp`.
   *
   * @default - a unique temporary directory in the system temp directory
   */
  readonly outputPath?: string;
}

/**
 * Options for creating `AssetCode` with a custom command, such as running a buildfile.
 */
export interface CustomCommandOptions extends s3_assets.AssetOptions {
  /**
   * options that are passed to the spawned process, which determine the characteristics of the spawned process.
   *
   * @default: see `child_process.SpawnSyncOptions` (https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options).
   */
  readonly commandOptions?: { [options: string]: any };
}

/**
 * Optional parameters for creating code using bucket
 */
export interface BucketOptions {
  /**
   * Optional S3 object version
   */
  readonly objectVersion?: string;
  /**
   * The ARN of the KMS key used to encrypt the handler code.
   * @default - the default server-side encryption with Amazon S3 managed keys(SSE-S3) key will be used.
   */
  readonly sourceKMSKey?: IKey;
}
