import {describe,expect,it} from 'vitest'
import {displaySignDate} from './sign-date.js'

describe('displaySignDate',()=>{
  it('shows only the date part of ISO timestamp values',()=>expect(displaySignDate('2026-08-31T16:00:00.000Z')).toBe('2026-08-31'))
  it('keeps plain calendar dates and empty values untouched',()=>{expect(displaySignDate('2026-09-01')).toBe('2026-09-01');expect(displaySignDate('')).toBe('')})
})
