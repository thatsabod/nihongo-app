import { createContext, useContext } from 'react'

// Shared between App and every exercise overlay so each wrong answer can
// drain a heart ("battery") and the exercise can react when it hits zero.
export const HeartsContext = createContext(null)

export function useHearts() {
  return useContext(HeartsContext)
}
