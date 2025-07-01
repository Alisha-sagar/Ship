/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as email from "../email.js";
import type * as filtering from "../filtering.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as profiles from "../profiles.js";
import type * as reports from "../reports.js";
import type * as router from "../router.js";
import type * as status from "../status.js";
import type * as storage from "../storage.js";
import type * as swipes from "../swipes.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  email: typeof email;
  filtering: typeof filtering;
  http: typeof http;
  messages: typeof messages;
  profiles: typeof profiles;
  reports: typeof reports;
  router: typeof router;
  status: typeof status;
  storage: typeof storage;
  swipes: typeof swipes;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
