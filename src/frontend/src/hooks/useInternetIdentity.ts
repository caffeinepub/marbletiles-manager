/**
 * Re-export useInternetIdentity from the caffeine core-infrastructure package.
 *
 * SettingsPage and SetupProfilePage import this hook. Since we use localStorage-based
 * auth (not Internet Identity), the identity will be undefined — callers handle this
 * gracefully with optional chaining (identity?.getPrincipal()).
 */
export {
  useInternetIdentity,
  type InternetIdentityContext,
  type Status,
} from "@caffeineai/core-infrastructure";
