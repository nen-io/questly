import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL
    || (process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME
        ? `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@localhost:5432/${process.env.DB_NAME}`
        : undefined);

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
}

const connection = postgres(databaseUrl);

export const db = drizzle(connection, { schema });
export const closeDbConnection = () => connection.end();
