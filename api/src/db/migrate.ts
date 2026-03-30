import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL
    || (process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME
        ? `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@localhost:5432/${process.env.DB_NAME}`
        : undefined);

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
}

const run = async () => {
    const connection = postgres(databaseUrl, { max: 1 });
    const migrationDb = drizzle(connection);

    await migrate(migrationDb, { migrationsFolder: 'drizzle' });

    await connection.end();
};

run().catch((error) => {
    console.error('Migration failed');
    console.error(error);
    process.exit(1);
});
