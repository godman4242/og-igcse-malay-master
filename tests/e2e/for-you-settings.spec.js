import { test, expect } from '@playwright/test'

// For You — the Settings personalization controls (Phase 1). These are the
// learner's entry point to customization Kheshav specifically asked for, so this
// pins the UI→store wiring end-to-end (not just the store logic): the goal-preset
// chooser and the customizable "Still remember these?" recall probe.
//
// Vite "?t=…" trap: see CLAUDE.md. Rebind window.__STORE after every goto.
async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
    return url
  })
}

const goalPreset = (page) => page.evaluate(() => window.__STORE.getState().identity.goalPreset)
const recallProbe = (page) => page.evaluate(() => window.__STORE.getState().recallProbe)

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

test.describe('For You — Settings personalization controls', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await bindStore(page)
  })

  test('goal-preset chooser writes identity.goalPreset and toggles off when re-clicked', async ({ page }) => {
    const group = page.getByRole('group', { name: /goal preset/i })
    await group.getByRole('button', { name: /speak confidently/i }).click()
    expect(await goalPreset(page)).toBe('speak')

    // Re-clicking the active preset clears it (back to no preset).
    await group.getByRole('button', { name: /speak confidently/i }).click()
    expect(await goalPreset(page)).toBeNull()
  })

  test('recall-probe control: Strict snaps to 30/21, Custom keeps custom days, Off disables', async ({ page }) => {
    const modes = page.getByRole('group', { name: /recall probe sensitivity/i })

    await modes.getByRole('button', { name: /^strict$/i }).click()
    expect(await recallProbe(page)).toMatchObject({ mode: 'strict', stabilityDays: 30, idleDays: 21 })

    await modes.getByRole('button', { name: /^default$/i }).click()
    expect(await recallProbe(page)).toMatchObject({ mode: 'default', stabilityDays: 21, idleDays: 14 })

    // Custom reveals day inputs; editing one keeps it (doesn't snap to a preset).
    await modes.getByRole('button', { name: /^custom$/i }).click()
    const settled = page.getByRole('spinbutton').first()
    await settled.fill('45')
    await settled.blur()
    expect(await recallProbe(page)).toMatchObject({ mode: 'custom', stabilityDays: 45 })

    // The On/Off toggle disables the whole feature (→ the For You shelf hides).
    await page.getByRole('button', { name: /still remember these — toggle on or off/i }).click()
    expect((await recallProbe(page)).enabled).toBe(false)
  })
})
