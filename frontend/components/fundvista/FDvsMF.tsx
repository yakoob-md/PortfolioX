'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GitCompare, TrendingUp, Banknote } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

export default function FDvsMF() {
  const [investmentAmount, setInvestmentAmount] = useState(500000)
  const [years, setYears] = useState(10)
  const [fdRate, setFdRate] = useState(7)
  const [taxSlab, setTaxSlab] = useState('30')
  const [result, setResult] = useState<{
    fd: { rate: number; finalValue: number; gain: number; tax: number; afterTax: number; afterTaxReturn: number }
    equityMF: { rate: number; finalValue: number; gain: number; tax: number; afterTax: number; afterTaxReturn: number }
    debtMF: { rate: number; finalValue: number; gain: number; tax: number; afterTax: number; afterTaxReturn: number }
    realReturns: { fd: number; equity: number; debt: number }
    inflationImpact: { purchasingPower: number; valueErosion: number }
    verdict: string
    yearlyComparison: { year: number; fd: number; equity: number; debt: number; fdAfterTax: number; eqAfterTax: number; debtAfterTax: number }[]
  } | null>(null)

  const compare = async () => {
    try {
      const res = await fetch('/api/funds/fd-vs-mf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investmentAmount, years, fdRate, equityReturn: 12, debtReturn: 8, taxSlab: parseInt(taxSlab) })
      })
      setResult(await res.json())
    } catch { /* */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center">
          <GitCompare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">FD vs Mutual Fund</h2>
          <p className="text-sm text-muted-foreground">After-tax real returns comparison</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><Label>Investment (₹)</Label><Input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value))} /></div>
            <div><Label>Duration (Years)</Label><Input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min={1} max={30} /></div>
            <div><Label>FD Rate (%)</Label><Input type="number" value={fdRate} onChange={e => setFdRate(Number(e.target.value))} step={0.1} /></div>
            <div><Label>Tax Slab</Label>
              <Select value={taxSlab} onValueChange={setTaxSlab}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (No tax)</SelectItem><SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem><SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem><SelectItem value="30">30%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={compare} className="w-full bg-emerald-600 hover:bg-emerald-700">⚖️ Compare FD vs MF</Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-6 text-center">
                <Banknote className="mx-auto h-6 w-6 text-amber-600" />
                <p className="text-xs text-muted-foreground mt-1">Fixed Deposit</p>
                <p className="text-sm font-bold">After-Tax: {formatCurrency(result.fd.afterTax)}</p>
                <p className="text-xs text-muted-foreground">Tax: {formatCurrency(result.fd.tax)} · Return: {result.fd.afterTaxReturn}%</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="text-xs text-muted-foreground mt-1">Equity Mutual Fund</p>
                <p className="text-sm font-bold">After-Tax: {formatCurrency(result.equityMF.afterTax)}</p>
                <p className="text-xs text-muted-foreground">Tax: {formatCurrency(result.equityMF.tax)} · Return: {result.equityMF.afterTaxReturn}%</p>
              </CardContent>
            </Card>
            <Card className="bg-teal-50/50 dark:bg-teal-950/20">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground mt-1">Debt Mutual Fund</p>
                <p className="text-sm font-bold">After-Tax: {formatCurrency(result.debtMF.afterTax)}</p>
                <p className="text-xs text-muted-foreground">Tax: {formatCurrency(result.debtMF.tax)} · Return: {result.debtMF.afterTaxReturn}%</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-6"><p className="font-bold text-emerald-700 dark:text-emerald-400">{result.verdict}</p>
              <p className="text-xs text-muted-foreground mt-1">Inflation erodes {result.inflationImpact.valueErosion}% purchasing power over {years} years</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">After-Tax Growth Comparison</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={result.yearlyComparison.filter((_, i) => i % 2 === 0 || i === result.yearlyComparison.length - 1)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="fdAfterTax" fill="#f59e0b" name="FD After Tax" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="eqAfterTax" fill="#10b981" name="Equity MF After Tax" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debtAfterTax" fill="#0d9488" name="Debt MF After Tax" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Real Returns (After 6% Inflation)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xs text-muted-foreground">FD Real Return</p><p className={`text-lg font-bold ${result.realReturns.fd > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{result.realReturns.fd}%</p></div>
                <div><p className="text-xs text-muted-foreground">Equity MF Real Return</p><p className="text-lg font-bold text-emerald-600">{result.realReturns.equity}%</p></div>
                <div><p className="text-xs text-muted-foreground">Debt MF Real Return</p><p className={`text-lg font-bold ${result.realReturns.debt > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{result.realReturns.debt}%</p></div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
