import { getSlotContributions } from "./slotRegistry";

import type { SlotModels, SlotName } from "../types";

interface SlotProperties<Name extends SlotName> {
  name: Name;
  model: SlotModels[Name];
}

export function Slot<Name extends SlotName>({ name, model }: SlotProperties<Name>) {
  const contributions = getSlotContributions(name);

  return contributions.map((contribution) => (
    <span className="slot-contribution" data-slot={name} data-contribution={contribution.name} key={contribution.name}>
      {contribution.render({ model, contribution })}
    </span>
  ));
}
