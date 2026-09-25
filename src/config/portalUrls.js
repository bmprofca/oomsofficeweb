/**
 * Cross-portal URLs for OOMS panels.
 * Production domains:
 *   Office (CLIENT)  → app.ooms.in
 *   End client       → client.ooms.in
 *   CA               → ca.ooms.in
 */
const trimSlash = (url) => String(url || "").replace(/\/$/, "");

export const PORTAL_URLS = {
  app: trimSlash(
    process.env.REACT_APP_PORTAL_APP_URL || "https://app.ooms.in"
  ),
  client: trimSlash(
    process.env.REACT_APP_PORTAL_CLIENT_URL || "https://client.ooms.in"
  ),
  ca: trimSlash(process.env.REACT_APP_PORTAL_CA_URL || "https://ca.ooms.in"),
};

export const PORTALS = [
  {
    id: "app",
    label: "Office",
    description: "Firm workspace",
    url: PORTAL_URLS.app,
    loginPath: "/login",
    registerPath: "/register",
  },
  {
    id: "client",
    label: "Client",
    description: "End-client portal",
    url: PORTAL_URLS.client,
    loginPath: "/login",
  },
  {
    id: "ca",
    label: "CA",
    description: "CA practice portal",
    url: PORTAL_URLS.ca,
    loginPath: "/login",
  },
];

export const portalLoginUrl = (id) => {
  const portal = PORTALS.find((p) => p.id === id);
  if (!portal) return PORTAL_URLS.app + "/login";
  return `${portal.url}${portal.loginPath}`;
};

export const portalRegisterUrl = () =>
  `${PORTAL_URLS.app}/register`;
