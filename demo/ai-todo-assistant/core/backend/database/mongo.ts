import { MongoClient, type ClientSession, type Db } from "mongodb";
import type { TransactionRunner } from "./transaction-runner.js";

export interface MongoDatabase extends TransactionRunner<ClientSession> {
  connect(): Promise<Db>;
  close(): Promise<void>;
}

export function createMongoDatabase(uri: string, databaseName: string): MongoDatabase {
  const client = new MongoClient(uri);
  let database: Db | undefined;

  async function connect(): Promise<Db> {
    if (!database) {
      await client.connect();
      database = client.db(databaseName);
      await database.command({ ping: 1 });
    }
    return database;
  }

  async function close(): Promise<void> {
    await client.close();
    database = undefined;
  }
  async function withTransaction<Value>(
    work: (session: ClientSession) => Promise<Value>,
  ): Promise<Value> {
    const session = client.startSession();
    try {
      let value: Value | undefined;
      await session.withTransaction(async () => {
        value = await work(session);
      });
      return value as Value;
    } finally {
      await session.endSession();
    }
  }
  return { connect, close, withTransaction };
}
