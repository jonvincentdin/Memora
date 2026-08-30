export function describeUserAgent(userAgent?: string | null): string {
  if (!userAgent) return "an unknown device";

  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /(?:Chrome|CriOS)\//.test(userAgent)
      ? "Chrome"
      : /(?:Firefox|FxiOS)\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "a web browser";

  const platform = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Windows NT/.test(userAgent)
          ? "Windows"
          : /CrOS/.test(userAgent)
            ? "ChromeOS"
            : /Mac OS X|Macintosh/.test(userAgent)
              ? "macOS"
              : /Linux/.test(userAgent)
                ? "Linux"
                : "an unknown platform";

  return `${browser} on ${platform}`;
}
