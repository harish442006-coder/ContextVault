import type { ContextAccessLevel } from "../context/context-contract.js";

export class TrustPolicyService {
  canRead(
    accessLevel: ContextAccessLevel
  ): boolean {
    return (
      accessLevel === "READ" ||
      accessLevel === "PROPOSE" ||
      accessLevel === "WRITE"
    );
  }

  canPropose(
    accessLevel: ContextAccessLevel
  ): boolean {
    return (
      accessLevel === "PROPOSE" ||
      accessLevel === "WRITE"
    );
  }

  canWrite(
    accessLevel: ContextAccessLevel
  ): boolean {
    return accessLevel === "WRITE";
  }
}