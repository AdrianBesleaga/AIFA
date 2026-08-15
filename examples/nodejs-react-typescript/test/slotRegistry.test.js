import assert from "node:assert/strict";
import test from "node:test";

import { getSlotContributions, registerSlotContribution } from "../frontend/src/slots/slotRegistry.ts";

test("sorts slot contributions by order", () => {
  registerSlotContribution({
    slot: "TEST_SLOT",
    name: "second",
    order: 20,
    render: () => null,
  });
  registerSlotContribution({
    slot: "TEST_SLOT",
    name: "first",
    order: 10,
    render: () => null,
  });

  assert.deepEqual(
    getSlotContributions("TEST_SLOT").map((contribution) => contribution.name),
    ["first", "second"],
  );
});

test("replaces duplicate slot contribution names", () => {
  registerSlotContribution({
    slot: "REPLACE_SLOT",
    name: "action",
    order: 20,
    render: () => "old",
  });
  registerSlotContribution({
    slot: "REPLACE_SLOT",
    name: "action",
    order: 10,
    render: () => "new",
  });

  const contributions = getSlotContributions("REPLACE_SLOT");

  assert.equal(contributions.length, 1);
  assert.equal(contributions[0].order, 10);
  assert.equal(contributions[0].render(), "new");
});
