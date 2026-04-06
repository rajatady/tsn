export type InspectorProp = string

export interface PropertyExpectation {
  kind: string
  id: string
  prop: InspectorProp
  equals?: string
  includes?: string
}

export interface FrameExpectation {
  kind: string
  id: string
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  minX?: number
  minY?: number
}

export interface TreeExpectation {
  kind: string
  includes: string
}

export type ConformanceExpectation =
  | PropertyExpectation
  | FrameExpectation
  | TreeExpectation

export interface ConformanceActionClickById {
  kind: string
  id: string
}

export interface ConformanceActionClickByLabel {
  kind: string
  label: string
}

export interface ConformanceActionTypeById {
  kind: string
  id: string
  text: string
}

export type ConformanceAction =
  | ConformanceActionClickById
  | ConformanceActionClickByLabel
  | ConformanceActionTypeById

export interface ConformanceCase {
  id: string
  label: string
  actions: ConformanceAction[]
  expects: ConformanceExpectation[]
}

export interface ConformanceSuite {
  id: string
  label: string
  description: string
  artifactPrefix: string
  navLabel: string
  navTestId: string
  navTag: number
  covers: string[]
  cases: ConformanceCase[]
}
