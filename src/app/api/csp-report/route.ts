import { NextResponse } from "next/server";

const MAX_REPORT_SIZE = 16 * 1024;

/**
 * Accept CSP violation reports without exposing the raw attacker-controlled
 * report body in application logs.
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > MAX_REPORT_SIZE) {
    return new NextResponse(null, { status: 413 });
  }

  const body = await request.text();

  if (body.length > MAX_REPORT_SIZE) {
    return new NextResponse(null, { status: 413 });
  }

  try {
    const payload = JSON.parse(body) as Record<string, unknown>;

    const report =
      typeof payload["csp-report"] === "object" &&
      payload["csp-report"] !== null
        ? payload["csp-report"]
        : typeof payload.body === "object" && payload.body !== null
          ? payload.body
          : payload;

    if (typeof report !== "object" || report === null) {
      return new NextResponse(null, { status: 400 });
    }

    const violation = report as Record<string, unknown>;

    console.warn("CSP violation", {
      effectiveDirective: violation.effectiveDirective,
      blockedURL: violation.blockedURL,
      documentURL: violation.documentURL,
      sourceFile: violation.sourceFile,
      disposition: violation.disposition,
      statusCode: violation.statusCode,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
