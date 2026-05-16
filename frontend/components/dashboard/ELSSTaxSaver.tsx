'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ShieldCheck, TrendingUp, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

export default function ELSSTaxSaver() {
  const [investmentAmount, setInvestmentAmount] = useState(150000)
  const [taxSlab, setTaxSlab] = useState('30')
  const [result, setResult] = useState<{
    investmentAmount: number; eligibleAmount: number; taxSaved: number; effectiveInvestment: number
    elssFunds: { id: string; schemeName: string; fundHouse: string; directReturn1y: number | null; directReturn3y: number | null; directReturn5y: number | null; directExpenseRatio: number; aumCrore: number; riskometer: string }[]
    options80C: { name: string; lockIn: string; expectedReturn: string; risk: string; liquidity: string; taxOnWithdrawal: string; recommended: boolean }[]
    projectedReturns: { avgElssReturn: number; projectedValue3y: number; gainAfterLockIn: number }
    advantages: string[]
  } | null>(null)

  const calculate = async () => {
    try {
      const res = await fetch('/api/tax/elss', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investmentAmount, taxSlab: parseInt(taxSlab) })
      })
      setResult(await res.json())
    } catch { /* */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">ELSS Tax Saver</h2>
          <p className="text-sm text-muted-foreground">Save tax under Section 80C with ELSS funds</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Investment Amount (₹)</Label><Input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value))} max={1500000} /></div>
            <div><Label>Tax Slab</Label>
              <Select value={taxSlab} onValueChange={setTaxSlab}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem><SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem><SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem><SelectItem value="30">30%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button onClick={calculate} className="w-full bg-emerald-600 hover:bg-emerald-700">🛡️ Calculate Tax Saving</Button></div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Tax Saved This Year</p><p className="text-3xl font-bold text-emerald-600">{formatCurrency(result.taxSaved)}</p><p className="text-xs text-muted-foreground">Under Section 80C</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Effective Investment</p><p className="text-3xl font-bold">{formatCurrency(result.effectiveInvestment)}</p><p className="text-xs text-muted-foreground">After tax saving, you effectively invest only this much</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Projected Value (3Y Lock-in)</p><p className="text-3xl font-bold text-emerald-600">{formatCurrency(result.projectedReturns.projectedValue3y)}</p><p className="text-xs text-muted-foreground">At avg {result.projectedReturns.avgElssReturn}% return</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Section 80C Options Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Instrument</TableHead><TableHead>Lock-in</TableHead><TableHead>Returns</TableHead><TableHead>Risk</TableHead><TableHead>Liquidity</TableHead><TableHead>Tax on Withdrawal</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {result.options80C.map(o => (
                      <TableRow key={o.name} className={o.recommended ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                        <TableCell className="font-medium">{o.name} {o.recommended && <Badge className="ml-1 bg-emerald-600 text-[9px]">Best</Badge>}</TableCell>
                        <TableCell>{o.lockIn}</TableCell>
                        <TableCell>{o.expectedReturn}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{o.risk}</Badge></TableCell>
                        <TableCell className="text-xs">{o.liquidity}</TableCell>
                        <TableCell className="text-xs">{o.taxOnWithdrawal}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">ELSS Funds Available</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {result.elssFunds.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div><p className="font-medium text-sm">{f.schemeName}</p><p className="text-xs text-muted-foreground">{f.fundHouse}</p></div>
                    <div className="flex gap-4 text-xs text-right">
                      <div><span className="text-muted-foreground">3Y:</span> <span className="font-medium">{f.directReturn3y?.toFixed(1) || '—'}%</span></div>
                      <div><span className="text-muted-foreground">5Y:</span> <span className="font-medium">{f.directReturn5y?.toFixed(1) || '—'}%</span></div>
                      <div><span className="text-muted-foreground">Exp:</span> <span className="font-medium">{f.directExpenseRatio}%</span></div>
                      <Badge variant="outline" className="text-[9px]">{f.riskometer}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardContent className="pt-6">
              <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-2">✅ ELSS Advantages</p>
              <ul className="space-y-1">
                {result.advantages.map((a, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-emerald-500 mt-1">•</span>{a}</li>)}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
