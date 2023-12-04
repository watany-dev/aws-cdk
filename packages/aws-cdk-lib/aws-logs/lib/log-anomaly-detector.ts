import { Construct } from 'constructs';
import { CfnLogAnomalyDetector } from './logs.generated';
import { Arn, ArnFormat, Resource } from '../../core';

export enum EvaluationFrequency {
  /**
   * FIFTEEN_MIN
   */
  FIFTEEN_MIN = 'FIFTEEN_MIN',
  /**
   * FIVE_MIN
   */
  FIVE_MIN = 'FIVE_MIN',
  /**
   * ONE_HOUR
   */
  ONE_HOUR = 'ONE_HOUR',
  /**
   * TEN_MIN
   */
  TEN_MIN = 'TEN_MIN',
  /**
   * THIRTY_MIN
   */
  THIRTY_MIN = 'THIRTY_MIN',
}

export interface LogAnomalyDetectorOptions {
  /**
   * The ID of the account to create the anomaly detector in.
   * If not specified, the current account is used.
   */
  readonly accountId?: string;

  /**
   * The number of days to have visibility on an anomaly.
   * After this period, the anomaly is automatically baselined.
   */
  readonly anomalyVisibilityTime?: number;

  /**
   * A name for this anomaly detector.
   */
  readonly detectorName?: string;

  /**
   * Specifies how often the anomaly detector is to run.
   * Choose from the EvaluationFrequency enum.
   */
  readonly evaluationFrequency?: EvaluationFrequency;

  /**
   * Pattern to limit the anomaly detection model to examine only log events that match.
   */
  readonly filterPattern?: string;

  /**
   * Optionally assigns a AWS KMS key to secure this anomaly detector and its findings.
   */
  readonly kmsKeyId?: string;

  /**
   * The ARN of the log group that is associated with this anomaly detector.
   * You can specify only one log group ARN.
   */
  readonly logGroupArnList?: string[];
}

/**
 * A detector that identifies anomalies in CloudWatch Log Groups and reports them.
 */
export class LogAnomalyDetector extends Resource {

  /**
   * Constructs a new instance of the LogAnomalyDetector class.
   *
   * @param scope The scope in which to define this construct.
   * @param id The scoped construct ID. Must be unique amongst siblings in the same scope.
   * @param props The properties for configuring the LogAnomalyDetector.
   */
  constructor(scope: Construct, id: string, props: LogAnomalyDetectorOptions) {
    super(scope, id, {
      physicalName: props.detectorName,
    });

    // Validate the logGroupArnList if provided
    if (!props.logGroupArnList || props.logGroupArnList.length === 0) {
      throw new Error('logGroupArnList must be provided and cannot be empty.');
    }

    // Parse and reconstruct each ARN in the list
    const parsedArnList = props.logGroupArnList.map(arn => {
      const parsedArn = Arn.split(arn, ArnFormat.COLON_RESOURCE_NAME);
      return `arn:${parsedArn.partition}:${parsedArn.region}:${parsedArn.account}:${parsedArn.resource}:${parsedArn.resourceName}`;
    });

    const parsedArnList = props.logGroupArnList.map(arn => {
      const parsedArn = Arn.parse(arn);
      return `arn:${parsedArn.partition}:${parsedArn.service}:${parsedArn.region}:${parsedArn.account}:${parsedArn.resource}`;
    });

    // Create the CloudFormation resource for the Log Anomaly Detector
    new CfnLogAnomalyDetector(this, id, {
      accountId: props.accountId,
      anomalyVisibilityTime: props.anomalyVisibilityTime,
      detectorName: props.detectorName ?? id,
      evaluationFrequency: props.evaluationFrequency,
      filterPattern: props.filterPattern,
      kmsKeyId: props.kmsKeyId,
      logGroupArnList: parsedArnList,
    });
  }
}