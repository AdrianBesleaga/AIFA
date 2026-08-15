export interface TransactionRunner<Context = void> {
  withTransaction<Value>(work: (context: Context) => Promise<Value>): Promise<Value>;
}
