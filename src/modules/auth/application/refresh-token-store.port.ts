export type RotateResult = "OK" | "MISSING" | "REUSE";

export interface IRefreshTokenStore {
  issue(family: string, jti: string): Promise<void>;
  rotate(family: string, oldJti: string, newJti: string): Promise<RotateResult>;
  revoke(family: string): Promise<void>;
}
