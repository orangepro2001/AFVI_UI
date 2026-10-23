import type { Attrs, Recorder } from './recorder'

/**
 * The recorder of the running application, so that a component can write down what the user did
 * without being handed one. Until `startJournal` has set it (and in tests) nothing is recorded.
 */
let current: Recorder | null = null

export function startJournal(recorder: Recorder | null): void {
  current = recorder
}

export function record(kind: string, attrs?: Attrs): void {
  current?.record(kind, attrs)
}
