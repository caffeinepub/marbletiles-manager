/**
 * useActor — wraps the caffeine core-infrastructure hook with our backend's createActor.
 *
 * All pages call:  const { actor, isFetching } = useActor();
 *
 * The Backend class from backend.ts has an empty interface (bindgen hasn't run yet),
 * so we cast to RRMHActor which declares all the actual canister methods.
 * The runtime binding via createActorWithConfig still connects to the real canister.
 */

import { useActor as useCaffeineActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { RRMHActor } from "../types";

export interface UseActorResult {
  actor: RRMHActor | null;
  isFetching: boolean;
  /** true once the actor query has settled (either actor loaded or failed) */
  isReady: boolean;
}

export function useActor(): UseActorResult {
  const result = useCaffeineActor(createActor);
  const isReady = !result.isFetching;
  return {
    actor: result.actor as unknown as RRMHActor | null,
    isFetching: result.isFetching,
    isReady,
  };
}
