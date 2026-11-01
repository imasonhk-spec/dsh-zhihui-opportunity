import {describe,expect,it} from 'vitest'
import {importChangeTrackingEnabled,requireImportChangeTrackingEnabled} from './import-change-feature.js'

describe('import change tracking feature gate',()=>{
  it('is enabled by default and for explicit truthy values',()=>{
    expect(importChangeTrackingEnabled(undefined)).toBe(true)
    expect(importChangeTrackingEnabled('true')).toBe(true)
    expect(importChangeTrackingEnabled('1')).toBe(true)
  })
  it('rejects explicit disabled values case-insensitively',()=>{
    for(const value of ['false','0','off','DISABLED',' disabled ']){
      expect(importChangeTrackingEnabled(value)).toBe(false)
      expect(()=>requireImportChangeTrackingEnabled(value)).toThrow('import_change_tracking_disabled')
    }
  })
})
