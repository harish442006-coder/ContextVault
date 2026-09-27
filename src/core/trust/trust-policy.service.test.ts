import { test } from "node:test";
import assert from "node:assert/strict";

import { TrustPolicyService } from "./trust-policy.service.js";

test("READ access can only read", () => {
  const policy = new TrustPolicyService();

  assert.equal(policy.canRead("READ"), true);
  assert.equal(policy.canPropose("READ"), false);
  assert.equal(policy.canWrite("READ"), false);
});

test("PROPOSE access can read and propose but cannot write", () => {
  const policy = new TrustPolicyService();

  assert.equal(policy.canRead("PROPOSE"), true);
  assert.equal(policy.canPropose("PROPOSE"), true);
  assert.equal(policy.canWrite("PROPOSE"), false);
});

test("WRITE access can read, propose and write", () => {
  const policy = new TrustPolicyService();

  assert.equal(policy.canRead("WRITE"), true);
  assert.equal(policy.canPropose("WRITE"), true);
  assert.equal(policy.canWrite("WRITE"), true);
});