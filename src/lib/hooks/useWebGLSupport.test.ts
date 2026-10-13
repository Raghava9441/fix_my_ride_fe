import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetWebGLSupportCache, detectWebGLSupport } from './useWebGLSupport'

function stubContext(ctx: unknown) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ctx) as never)
}

describe('detectWebGLSupport', () => {
  beforeEach(() => __resetWebGLSupportCache())
  afterEach(() => {
    vi.unstubAllGlobals()
    __resetWebGLSupportCache()
  })

  it('is true when a webgl2 context can be created', () => {
    stubContext({})
    expect(detectWebGLSupport()).toBe(true)
  })

  it('is false when no context is available', () => {
    stubContext(null)
    expect(detectWebGLSupport()).toBe(false)
  })

  it('is false when getContext throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(detectWebGLSupport()).toBe(false)
  })

  it('is false when the user has asked to save data', () => {
    stubContext({})
    vi.stubGlobal('navigator', { connection: { saveData: true } })
    expect(detectWebGLSupport()).toBe(false)
  })
})
