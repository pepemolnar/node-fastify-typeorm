import { State } from "../types/general.types.js";

export class CircuitBreaker {
  private state: State = "closed";
  private failures = 0;
  private openedAt = 0;

  constructor(
    private threshold = 5,
    private cooldownMs = 30_000,
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt < this.cooldownMs) {
        throw new Error("Circuit open — failing fast");
      }
      this.state = "half-open"; // cooldown elapsed → probe once
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = "closed"; // success → recover
      return result;
    } catch (err) {
      this.failures++;
      if (this.state === "half-open" || this.failures >= this.threshold) {
        this.state = "open"; // trip
        this.openedAt = Date.now();
      }
      throw err;
    }
  }
}
