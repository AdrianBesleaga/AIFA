/** Published Task Management vocabulary. Values mirror task-taxonomy.schema.json. */
export enum TaskCategory {
  Work = "Work",
  Personal = "Personal",
  Sport = "Sport",
  Shopping = "Shopping",
  Other = "Other",
}
export enum TaskPriority {
  Low = "Low",
  Medium = "Medium",
  High = "High",
}
export enum TaskStatus {
  Todo = "Todo",
  InProgress = "InProgress",
  Completed = "Completed",
}

function parseEnumValue<Value extends string>(
  values: readonly Value[],
  value: string,
): Value | undefined {
  return values.find((candidate) => candidate === value);
}

export function parseTaskCategory(value: string): TaskCategory | undefined {
  return parseEnumValue(Object.values(TaskCategory), value);
}

export function parseTaskPriority(value: string): TaskPriority | undefined {
  return parseEnumValue(Object.values(TaskPriority), value);
}
