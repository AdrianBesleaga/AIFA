import { frontendModules } from "../../../composition/generated/frontend-modules.js";
import {
  frontendEventRegistry,
  type FrontendEventConsumer,
} from "../events/event-registry.js";
import { registerSlotContribution, type AnySlotContribution } from "../slots/slot-registry.js";

interface ContributionModule {
  contribution?: AnySlotContribution;
  contributions?: AnySlotContribution[];
  eventConsumers?: FrontendEventConsumer[];
}
const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();

interface EventConsumerDeclaration {
  readonly name: string;
  readonly eventType: string;
  readonly contract: string;
}

async function loadModule(
  id: string,
  declarations: readonly EventConsumerDeclaration[],
  load: () => Promise<unknown>,
): Promise<void> {
  if (loaded.has(id)) return;
  const existing = pending.get(id);
  if (existing) return existing;
  const operation = load().then((value) => {
    const module = value as ContributionModule;
    const declared = declarations
      .map(({ name, eventType, contract }) => `${name}:${eventType}:${contract}`)
      .sort();
    const implemented = (module.eventConsumers ?? [])
      .map(({ name, eventType, contract }) => `${name}:${eventType}:${contract}`)
      .sort();
    if (declared.join() !== implemented.join())
      throw new Error(`Frontend event consumers do not match feature definition '${id}'`);
    if (module.contribution) registerSlotContribution(module.contribution);
    module.contributions?.forEach(registerSlotContribution);
    module.eventConsumers?.forEach((consumer) => frontendEventRegistry.register(consumer));
    loaded.add(id);
    pending.delete(id);
  });
  pending.set(id, operation);
  return operation;
}

export async function ensureFrontendContributions(): Promise<void> {
  await Promise.all(
    frontendModules.map(({ id, eventConsumers, load }) => loadModule(id, eventConsumers, load)),
  );
}
