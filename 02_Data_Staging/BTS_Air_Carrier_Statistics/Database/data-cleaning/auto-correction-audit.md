# Auto Correction Scan Audit

- Run timestamp: 2026-03-01 21:18:29 UTC
- Market rows scanned: 106,218
- Segment rows scanned: 108,964
- Source rules file: `data-cleaning.csv`

## Detected Multi-Value Airport-ID Anomalies

- `market` ID `12544` `CODE` values=['JQF', 'USA'] -> canonical `USA`
- `market` ID `13788` `CODE` values=['NZC', 'VQQ'] -> canonical `VQQ`
- `market` ID `16658` `CODE` values=['GLE', 'T1X'] -> canonical `GLE`
- `segment` ID `12544` `CODE` values=['JQF', 'USA'] -> canonical `USA`
- `segment` ID `13788` `CODE` values=['NZC', 'VQQ'] -> canonical `VQQ`
- `segment` ID `15081` `CODE` values=['BER', 'SXF'] -> canonical `BER`
- `segment` ID `16658` `CODE` values=['GLE', 'T1X'] -> canonical `GLE`
- `market` ID `16852` `CITY_NAME` values=['Mexico City, Mexico', 'Zumpango, Mexico'] -> canonical `Mexico City, Mexico`
- `segment` ID `16852` `CITY_NAME` values=['Mexico City, Mexico', 'Zumpango, Mexico'] -> canonical `Mexico City, Mexico`

## Candidate Rows Appended

```diff
# No new rows appended (all candidates already covered or no anomalies found).
```

## Candidate Rows Skipped (Already Covered)

- update,csv,16852,CITY_NAME,"Zumpango, Mexico","Mexico City, Mexico",AUTO-CANDIDATE (market) CITY_NAME: normalize to most recent value | AUTO-CANDIDATE (segment) CITY_NAME: normalize to most recent value
- update,csv,12544,CODE,JQF,USA,AUTO-CANDIDATE (market) CODE: normalize to most recent value | AUTO-CANDIDATE (segment) CODE: normalize to most recent value
- update,csv,13788,CODE,NZC,VQQ,AUTO-CANDIDATE (market) CODE: normalize to most recent value | AUTO-CANDIDATE (segment) CODE: normalize to most recent value
- update,segment,15081,CODE,SXF,BER,AUTO-CANDIDATE (segment) CODE: normalize to most recent value
- update,csv,16658,CODE,T1X,GLE,AUTO-CANDIDATE (market) CODE: normalize to most recent value | AUTO-CANDIDATE (segment) CODE: normalize to most recent value

## Multi-ID Code Conflicts (Manual Review)

### Market
- `T4X` -> IDs [16706, 16879]

### Segment
- `T4X` -> IDs [16706, 16879]
