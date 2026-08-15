import { config } from "../config.js";
import { createMongoDatabase } from "../database/mongo.js";
import { createMongoOutboxStore } from "./mongo-outbox.js";
import { publishPendingEvents } from "./outbox-publisher.js";
if (!config.mongoUri) throw new Error("MONGODB_URI is required for the outbox worker");
const database = createMongoDatabase(config.mongoUri, config.mongoDatabase);
const store = createMongoOutboxStore(await database.connect());
let running = true;
process.on("SIGTERM", () => (running = false));
process.on("SIGINT", () => (running = false));
while (running) {
  const delivered = await publishPendingEvents(store, async (event) => {
    console.log(JSON.stringify({ eventId: event.eventId, eventType: event.eventType }));
  });
  if (!delivered) await new Promise((resolve) => setTimeout(resolve, 1_000));
}
await database.close();
