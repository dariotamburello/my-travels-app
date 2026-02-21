import "server-only";

interface D1StatementResult<Row> {
  success: boolean;
  results?: Row[];
  errors?: Array<{ message?: string }>;
}

interface D1ApiResponse<Row> {
  success: boolean;
  result?: D1StatementResult<Row>[];
  errors?: Array<{ message?: string }>;
}

function readRequiredEnv(name: string): string {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

export async function queryD1<Row = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<Row[]> {
  const accountId = readRequiredEnv("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = readRequiredEnv("CLOUDFLARE_DATABASE_ID");
  const token = readRequiredEnv("CLOUDFLARE_D1_TOKEN");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql,
        params,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error HTTP D1 (${response.status}): ${text}`);
  }

  const data = (await response.json()) as D1ApiResponse<Row>;

  if (!data.success) {
    const apiMessage = data.errors
      ?.map((item) => item.message)
      .filter(Boolean)
      .join(" | ");
    throw new Error(apiMessage || "La API de D1 devolvió un error");
  }

  const statement = data.result?.[0];
  if (!statement?.success) {
    const statementMessage = statement?.errors
      ?.map((item) => item.message)
      .filter(Boolean)
      .join(" | ");
    throw new Error(statementMessage || "La consulta SQL en D1 falló");
  }

  return statement.results ?? [];
}
