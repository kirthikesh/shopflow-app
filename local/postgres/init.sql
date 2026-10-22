-- One Postgres server locally, one database per service (database-per-service pattern).
-- In Azure each service gets its own database on a PostgreSQL Flexible Server.
CREATE DATABASE products;
CREATE DATABASE orders;
