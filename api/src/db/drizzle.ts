import { drizzle } from "drizzle-orm/bun-sql";

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export const db = drizzle(DB_URL);
