import { createContext, useContext } from "react";

/**
 * True once the animated launch splash has finished. Screens read this to start
 * their entrance animations only AFTER the splash hands off — otherwise they'd
 * play hidden behind the splash overlay. Defaults to true so anything rendered
 * outside the provider just animates immediately.
 */
export const SplashDoneContext = createContext(true);

export function useSplashDone(): boolean {
  return useContext(SplashDoneContext);
}
