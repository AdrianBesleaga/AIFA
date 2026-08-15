import type { ReactNode } from "react";
import { SlotName } from "../../shared/architecture-enums.js";
import type {
  EmptySlotModel,
  ShellModel,
  TaskListModel,
  TaskRowActionsModel,
} from "../app-model.js";

export interface SlotModelMap {
  [SlotName.AppHeader]: ShellModel;
  [SlotName.AppNavigation]: ShellModel;
  [SlotName.AppContent]: ShellModel;
  [SlotName.AppFooter]: ShellModel;
  [SlotName.TaskComposer]: EmptySlotModel;
  [SlotName.TaskList]: TaskListModel;
  [SlotName.TaskRowActions]: TaskRowActionsModel;
  [SlotName.AssistantPanel]: EmptySlotModel;
  [SlotName.SettingsPanel]: ShellModel;
}

export interface SlotContribution<S extends SlotName> {
  slot: S;
  name: string;
  order?: number;
  render(model: SlotModelMap[S]): ReactNode;
}
export type AnySlotContribution = {
  [S in SlotName]: SlotContribution<S>;
}[SlotName];

export class SlotRegistry {
  readonly #contributions = new Map<SlotName, AnySlotContribution[]>();
  register(contribution: AnySlotContribution): void {
    const existing = this.#contributions.get(contribution.slot) ?? [];
    if (existing.some((item) => item.name === contribution.name))
      throw new Error(`Duplicate slot contribution '${contribution.slot}/${contribution.name}'`);
    this.#contributions.set(
      contribution.slot,
      [...existing, { ...contribution, order: contribution.order ?? 100 } as AnySlotContribution].sort(
        (left, right) =>
          (left.order ?? 100) - (right.order ?? 100) || left.name.localeCompare(right.name),
      ),
    );
  }
  get<S extends SlotName>(slot: S): readonly SlotContribution<S>[] {
    return (this.#contributions.get(slot) ?? []) as SlotContribution<S>[];
  }
  clear(): void {
    this.#contributions.clear();
  }
}

export const slotRegistry = new SlotRegistry();
export const registerSlotContribution = (contribution: AnySlotContribution) =>
  slotRegistry.register(contribution);
export const getSlotContributions = <S extends SlotName>(slot: S) => slotRegistry.get(slot);
