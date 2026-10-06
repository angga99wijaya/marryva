export function getPrismaDatasourceUrl(databaseUrl = process.env.DATABASE_URL): string {
  if (!databaseUrl) throw new Error("Set DATABASE_URL before starting the application.");

  const datasourceUrl = new URL(databaseUrl);
  if (datasourceUrl.port === "6543") {
    datasourceUrl.searchParams.set("pgbouncer", "true");
  }

  return datasourceUrl.toString();
}
