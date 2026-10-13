import { client } from "~/client/client.gen";
import { apiBaseUrl } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    /** Undefined when nothing answered the request */
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

client.setConfig({ baseUrl: apiBaseUrl() });

// A network failure resolves with the fetch TypeError and a proxy's error page
// arrives as a string, so normalise both to the server's `{ message }` shape
client.interceptors.error.use(error => {
  if (error instanceof Error) return { message: error.message };
  if (typeof error === "string") return { message: error.slice(0, 200) };
  return error;
});

/** Resolves to the response body, or throws an `ApiError` */
export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response?: Response }>
): Promise<T> {
  const { data, error, response } = await request;
  if (error !== undefined || data === undefined) {
    const message = (error as { message?: string } | undefined)?.message || "Request failed";
    throw new ApiError(response ? `${response.status}: ${message}` : message, response?.status);
  }
  return data;
}
