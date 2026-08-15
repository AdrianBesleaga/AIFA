import { Stack } from "@mui/material";
import { Fragment } from "react";
import type { SlotName } from "../../shared/architecture-enums.js";
import { getSlotContributions, type SlotModelMap } from "./slot-registry.js";

export function Slot<S extends SlotName>({ name, model }: { name: S; model: SlotModelMap[S] }) {
  return (
    <Stack gap={1}>
      {getSlotContributions(name).map((contribution) => (
        <Fragment key={contribution.name}>{contribution.render(model)}</Fragment>
      ))}
    </Stack>
  );
}
