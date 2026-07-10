export interface JobQueue {
  enqueue<T>(name: string, data: T): Promise<void>;
}
