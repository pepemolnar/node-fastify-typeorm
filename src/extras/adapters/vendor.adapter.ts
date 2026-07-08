import { CircuitBreaker } from "../circuit-breaker.js";
import { retry } from "../retry.js";

// Their shapes
interface VendorUser {
  usr_id: string;
  e_mail: string;
  created_ts: number;
}

// Our shape.
export interface ExternalUser {
  id: string;
  email: string;
  createdAt: Date;
}

const toDomain = (v: VendorUser): ExternalUser => ({
  id: v.usr_id,
  email: v.e_mail,
  createdAt: new Date(v.created_ts),
});

export class VendorAdapter {
  private breaker = new CircuitBreaker();
  constructor(private baseUrl: string) {}

  async getUser(id: string): Promise<ExternalUser | null> {
    try {
      const raw = await retry(() => this.breaker.run(() => this.fetch(id)));
      return toDomain(raw);
    } catch {
      return null;
    }
  }

  private async fetch(id: string): Promise<VendorUser> {
    const res = await fetch(`${this.baseUrl}/users/${id}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`Vendor responded ${res.status}`);
    return res.json() as Promise<VendorUser>;
  }
}
