import { Queue, type ConnectionOptions } from "bullmq";
import { JobQueue } from "../jobs/job-queue.port.js";
import { createQueueConnection } from "../jobs/connection.js";

export const QUEUE_NAME = "app";

export class BullMqJobQueue implements JobQueue {
  private queue: Queue;
  constructor(connection: ConnectionOptions = createQueueConnection()) {
    this.queue = new Queue(QUEUE_NAME, { connection });
  }
  async enqueue<T>(name: string, data: T): Promise<void> {
    await this.queue.add(name, data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
      removeOnFail: 100, // keep the last 100 failures for inspection
    });
  }
  async close(): Promise<void> {
    await this.queue.close();
  }
}
