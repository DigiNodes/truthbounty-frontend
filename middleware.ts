import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { i18nConfig } from "./src/i18n/config";
import {
  NONCE_HEADER,
  SECURITY_HEADER_NAMES,
  buildSecurityHeaders,
  createRequestNonce,
} from "./src/lib/security/headers";

const handleI18n = createMiddleware(i18nConfig);

export default function middleware(request: NextRequest) {
  const nonce = createRequestNonce();
  const isDevelopment = process.env.NODE_ENV === "development";

  const securityHeaders = buildSecurityHeaders({
    nonce,
    isDevelopment,
    reportOnly: false,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set(
    SECURITY_HEADER_NAMES.contentSecurityPolicy,
    securityHeaders[SECURITY_HEADER_NAMES.contentSecurityPolicy],
  );

  const requestWithSecurityHeaders = new NextRequest(request, {
    headers: requestHeaders,
  });

  const response = handleI18n(requestWithSecurityHeaders);

  for (const [name, value] of Object.entries(securityHeaders)) {
    response.headers.set(name, value);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
