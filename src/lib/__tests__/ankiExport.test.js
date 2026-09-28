// 2026-09-28 bug hunt R3 F4: the Anki export declares `#html:true` but wrote card
// text raw. A card imported from a shared-deck link (`?deck=`, untrusted input)
// carrying `<img onerror=…>` then ran script in Anki's reviewer on every showing;
// a tab or newline in a field forged extra columns / notes.
import { describe, it, expect } from 'vitest'
import { toAnkiText } from '../export'

describe('toAnkiText', () => {
  it('keeps the tab-separated HTML format for ordinary cards', () => {
    expect(toAnkiText([{ m: 'makan', e: 'eat', ex: 'Saya makan nasi.' }, { m: 'rumah', e: 'house' }]))
      .toBe('#separator:tab\n#html:true\nmakan\teat<br><small><em>Saya makan nasi.</em></small>\nrumah\thouse\n')
  })

  it('escapes HTML and flattens tabs/newlines in every field', () => {
    const txt = toAnkiText([{ m: 'makan<img src=x onerror="alert(1)">', e: 'eat\tforged\nrow', ex: '<b>x</b>' }])
    expect(txt).not.toContain('<img')
    expect(txt).toContain('makan&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    const body = txt.split('\n').slice(2).filter(Boolean)
    expect(body).toHaveLength(1)
    expect(body[0].split('\t')).toHaveLength(2)
    expect(body[0]).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})
