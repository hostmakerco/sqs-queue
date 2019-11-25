import { Consumer } from 'sqs-consumer';
import Producer from 'sqs-producer';

export interface ErrorDescriptor {
  err: Error;
  queueUrl: string;
  logId?: string;
}

export interface Logger {
  info: () => void;
  error: (error: ErrorDescriptor) => void;
}

export interface Options {
  region?: string;
  logger?: Logger;
  logId?: string;
}

export interface ListenerOptions {
  MaxNumberOfMessages?: number;
  MessageAttributeNames?: string[];
  VisibilityTimeout?: number;
  WaitTimeSeconds?: number;
}

const DEFAULT_VISIBILITY_TIMEOUT = 30;
const DEFAULT_REGION = 'eu-west-1';

export class SQSQueue {
  private readonly queueUrl: string;

  private readonly region?: string;

  private readonly logger?: Logger;

  private readonly logId?: string;

  private Producer: Producer;

  constructor(queueUrl: string, options: Options = {}) {
    this.queueUrl = queueUrl;
    this.region = options.region;
    this.logger = options.logger;
    this.logId = options.logId;
  }

  addListener(messageHandler: () => Promise<void>, sqsOptions: ListenerOptions = {}): Consumer {
    const sqsConsumerOptions = {
      batchSize: sqsOptions.MaxNumberOfMessages,
      messageAttributeNames: sqsOptions.MessageAttributeNames,
      visibilityTimeout: sqsOptions.VisibilityTimeout || DEFAULT_VISIBILITY_TIMEOUT,
      waitTimeSeconds: sqsOptions.WaitTimeSeconds,
      region: this.region || DEFAULT_REGION,
      queueUrl: this.queueUrl,
    };

    const listener = Consumer.create({
      ...sqsConsumerOptions,
      handleMessage: messageHandler,
    });

    listener.on('error', (err): void => {
      this.logger && this.logger.error({
        err,
        queueUrl: this.queueUrl,
        logId: this.logId,
      });
    });

    listener.start();

    return listener;
  }

  getProducer(): Producer {
    if (!this.Producer) {
      const sqsProducerOptions = {
        region: this.region || DEFAULT_REGION,
        queueUrl: this.queueUrl,
      };

      this.Producer = Producer.create(sqsProducerOptions);
    }
    return this.Producer;
  }
}
