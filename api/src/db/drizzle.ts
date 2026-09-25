import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

const port = Number(process.env.DB_PORT ?? 5432);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("DB_PORT must be a valid port number");
}

const client = new SQL({
  hostname: required("DB_HOST"),
  port,
  username: required("DB_USERNAME"),
  password: required("DB_PASSWORD"),
  database: required("DB_DATABASE"),
  tls: process.env.NODE_ENV === "production" ? "require" : "disable",
});

export const db = drizzle({ client });
