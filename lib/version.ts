/** Version của bản build (sinh trong next.config.ts), vd "2026.11.01-1012 · dc6bf9f". */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
export const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT ?? "";
export const APP_VERSION_LABEL = [APP_VERSION, APP_COMMIT].filter(Boolean).join(" · ");
