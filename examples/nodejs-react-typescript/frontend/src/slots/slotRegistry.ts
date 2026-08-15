import type { ReactNode } from "react";

import type { SlotModels, SlotName } from "../types";

export interface SlotContribution<Name extends SlotName> {
  slot: Name;
  name: string;
  order?: number;
  render: (properties: { model: SlotModels[Name]; contribution: SlotContribution<Name> }) => ReactNode;
}

const contributions = new Map<SlotName, unknown[]>();

export function registerSlotContribution<Name extends SlotName>(contribution: SlotContribution<Name>): void {
  const normalizedContribution: SlotContribution<Name> = {
    order: 100,
    ...contribution,
  };
  const slotContributions = (contributions.get(contribution.slot) ?? []) as SlotContribution<Name>[];
  const nextContributions = [
    ...slotContributions.filter((candidate) => candidate.name !== contribution.name),
    normalizedContribution,
  ].sort((left, right) => (left.order ?? 100) - (right.order ?? 100) || left.name.localeCompare(right.name));

  contributions.set(contribution.slot, nextContributions);
}

export function getSlotContributions<Name extends SlotName>(slot: Name): SlotContribution<Name>[] {
  return (contributions.get(slot) ?? []) as SlotContribution<Name>[];
}
