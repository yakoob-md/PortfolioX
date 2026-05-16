'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Grid3x3, CheckCircle } from 'lucide-react'
import { useFundStore } from '@/lib/store'

export default function CorrelationMatrix() {
  const { funds, selectedFundIds, toggleFundSelection } = useFundStore()
  const [matrix, setMatrix] = useState<number[][]>([])
  const [names, setNames] = useState<string[]>([])
  const [ids, setIds] = useState<string[]>([])

  const selectedFunds = funds.filter(f => selectedFundIds.includes(f.id)).slice(0, 6)

  useEffect(() => {
    if (selectedFundIds.length < 2) return
    fetch('/api/portfolio/correlation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fundIds: selectedFundIds.slice(0, 6) })
    }).then(r => r.json()).then(d => {
      setMatrix(d.matrix || [])
      setNames(d.fundNames || [])
      setIds(d.fundIds || [])
    }).catch(() => {})
  }, [selectedFundIds])

  const getColor = (val: number) => {
    if (val >= 0.8) return 'bg-red-500/40 text-red-700 dark:text-red-400'
    if (val >= 0.6) return 'bg-amber-500/30 text-amber-700 dark:text-amber-400'
    if (val >= 0.4) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
    if (val >= 0.2) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
    return 'bg-teal-500/20 text-teal-700 dark:text-teal-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
          <Grid3x3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Correlation Matrix</h2>
          <p className="text-sm text-muted-foreground">Select 2-6 funds in Compare tab to see correlation</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">Select funds (click to add, max 6):</p>
          <div className="flex flex-wrap gap-2">
            {funds.slice(0, 20).map(f => {
              const isSel = selectedFundIds.includes(f.id)
              return (
                <Badge key={f.id} variant={isSel ? 'default' : 'outline'} className={`cursor-pointer text-xs ${isSel ? 'bg-emerald-600' : ''}`} onClick={() => toggleFundSelection(f.id)}>
                  {f.schemeName.split(' ').slice(0, 3).join(' ')}
                  {isSel && <CheckCircle className="h-3 w-3 ml-1" />}
                </Badge>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Selected: {selectedFundIds.length}/6 funds</p>
        </CardContent>
      </Card>

      {matrix.length >= 2 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Correlation Heatmap</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="p-2 text-[10px] text-muted-foreground" />
                      {names.map((n, i) => <th key={i} className="p-2 text-[9px] font-medium text-center max-w-[100px] truncate">{n.split(' ').slice(0, 3).join(' ')}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 text-[9px] font-medium text-right max-w-[100px] truncate">{names[i]?.split(' ').slice(0, 3).join(' ')}</td>
                        {row.map((val, j) => (
                          <td key={j} className={`p-2 text-center text-xs font-bold rounded-md m-0.5 ${getColor(val)}`}>
                            {val.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 mt-3 text-[10px] text-muted-foreground justify-center">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-teal-500/20" /> Low (&lt;0.2)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-500/20" /> Medium (0.4-0.6)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500/40" /> High (&gt;0.8)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Diversification Analysis</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {matrix.flatMap((row, i) => row.slice(i + 1).map((val, j) => ({ f1: names[i], f2: names[i + 1 + j], corr: val }))).sort((a, b) => a.corr - b.corr).map((pair, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="text-xs truncate max-w-[60%]">
                      <span className="font-medium">{pair.f1.split(' ').slice(0, 3).join(' ')}</span>
                      <span className="text-muted-foreground mx-1">×</span>
                      <span className="font-medium">{pair.f2.split(' ').slice(0, 3).join(' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pair.corr < 0.4 ? 'default' : pair.corr > 0.7 ? 'destructive' : 'secondary'} className="text-[10px]">
                        {pair.corr < 0.4 ? '✓ Good Diversification' : pair.corr > 0.7 ? '⚠ High Overlap' : '~ Moderate'}
                      </Badge>
                      <span className="text-xs font-bold">{pair.corr.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedFundIds.length < 2 && (
        <Card><CardContent className="py-16 text-center"><Grid3x3 className="mx-auto h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-muted-foreground">Select at least 2 funds to see correlation</p></CardContent></Card>
      )}
    </div>
  )
}
