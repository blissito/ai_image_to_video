import { createClient } from "@libsql/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Conexión singleton simple
export const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_KEY!,
});
