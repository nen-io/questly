#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL to be ready without requiring system psql
until node -e "
const { Client } = require('pg');
const client = new Client({
  host: 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});
client.connect()
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
" >/dev/null 2>&1; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing commands"

if [ "$NODE_ENV" = "production" ]; then
  echo "Running in production mode"
  
  echo "Running migrations..."
  pnpm run migrate:prod
  
  echo "Ensuring baseline data exists..."
  pnpm run seed:prod
  
  echo "Starting application..."
  exec pnpm start
else
  echo "Running in development mode"

  # Install dependencies to ensure they are up to date
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile --config.confirmModulesPurge=false

  # Run migrations
  echo "Running migrations..."
  pnpm run db:migrate

  # Seed the database
  echo "Seeding database..."
  pnpm run db:seed

  # Start the application
  echo "Starting application..."
  exec pnpm run dev
fi
