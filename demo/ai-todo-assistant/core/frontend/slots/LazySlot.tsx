import { useEffect, useState } from "react";
import type { SlotName } from "../../shared/architecture-enums.js";
import { ensureFrontendContributions } from "../discovery/discover-contributions.js";
import { Slot } from "./Slot.js";
import type { SlotModelMap } from "./slot-registry.js";

/** Composition-root slot. Feature code uses the synchronous Slot to avoid a loader cycle. */
export function LazySlot<S extends SlotName>({
  name,
  model,
}: {
  name: S;
  model: SlotModelMap[S];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void ensureFrontendContributions().then(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);
  return ready ? <Slot name={name} model={model} /> : null;
}
