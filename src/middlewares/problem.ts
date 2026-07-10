export interface InvalidParam {
  path: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  instance?: string;
  errors?: InvalidParam[];
}

const STATUS_META: Record<number, { code: string; title: string }> = {
  400: { code: "BAD_REQUEST", title: "Bad Request" },
  401: { code: "UNAUTHORIZED", title: "Unauthorized" },
  403: { code: "FORBIDDEN", title: "Forbidden" },
  404: { code: "NOT_FOUND", title: "Not Found" },
  409: { code: "CONFLICT", title: "Conflict" },
  429: { code: "RATE_LIMITED", title: "Too Many Requests" },
  500: { code: "INTERNAL", title: "Internal Server Error" },
};

const metaFor = (status: number) =>
  STATUS_META[status] ?? { code: "ERROR", title: "Error" };

export function buildProblem(input: {
  status: number;
  code?: string;
  title?: string;
  detail?: string;
  instance?: string;
  errors?: InvalidParam[];
}): ProblemDetails {
  const meta = metaFor(input.status);
  return {
    type: "about:blank",
    title: input.title ?? meta.title,
    status: input.status,
    code: input.code ?? meta.code,
    ...(input.detail ? { detail: input.detail } : {}),
    ...(input.instance ? { instance: input.instance } : {}),
    ...(input.errors ? { errors: input.errors } : {}),
  };
}

type ZodValidationEntry = {
  instancePath?: string;
  message?: string;
  params?: { issue?: { path?: PropertyKey[]; message?: string } };
};

export function toInvalidParams(validation: unknown[]): InvalidParam[] {
  return (validation as ZodValidationEntry[]).map((v) => {
    const issuePath = v.params?.issue?.path;
    const path =
      issuePath && issuePath.length
        ? issuePath.map(String).join(".")
        : (v.instancePath ?? "").replace(/^\//, "").replace(/\//g, ".");
    return {
      path: path || "(root)",
      message: v.params?.issue?.message ?? v.message ?? "Invalid value",
    };
  });
}
