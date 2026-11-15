import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreatureDetailsPanel } from './CreatureDetailsPanel'
import type { Creature } from '../domain/types'

const creature: Creature = {
  id: 'srd:spellcaster',
  source: 'srd',
  name: 'Spellcaster',
  ac: 12,
  hpAverage: 20,
  dexterityModifier: 1,
  srdSpells: [{ index: 'shield', name: 'Shield', level: 1 }],
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('CreatureDetailsPanel spell popup', () => {
  const originalShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  )
  const originalClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  )
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    vi.unstubAllGlobals()
    if (originalShowModal) {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
    }
    if (originalClose) {
      Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
    }
  })

  it('keeps the spell description dialog open after the spell is clicked in StrictMode', async () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open')
        this.dispatchEvent(new Event('close'))
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'Shield',
          desc: ['An invisible barrier of magical force appears.'],
        }),
      }),
    )

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root.render(
        <StrictMode>
          <CreatureDetailsPanel creature={creature} />
        </StrictMode>,
      )
    })

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button')?.click()
    })

    const dialog = container.querySelector('dialog')
    expect(dialog?.open).toBe(true)
    expect(dialog?.textContent).toContain('An invisible barrier of magical force appears.')
  })
})
