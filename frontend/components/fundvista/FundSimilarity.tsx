'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Fingerprint, Percent, TrendingUp, Building2 } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatPercent, formatAUM } from '@/lib/helpers'

interface SimilarFund {
  id: string; schemeName: string; fundHouse: string; category: string; subCategory: string;
  directReturn1y: number | null; directReturn3y: number | null; directExpenseRatio: number;
  aumCrore: number; riskometer: string; similarityScore: number; sameFundHouse: boolean;
}

export default function FundSimilarity() {
  const { funds } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState('')
  const [similar, setSimilar] = useState<SimilarFund[]>([])
  const [sourceFund, setSourceFund] = useState<{ schemeName: string; category: string; subCategory: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedFundId) return
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/funds/similarity?fundId=${selectedFundId}`).then(r => r.json()).then(d => {
        if (!cancelled) {
          setSimilar(d.similar || [])
          setSourceFund(d.fund || null)
          setLoading(false)
        }
      }).catch(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [selectedFundId])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-500/10'
    if (score >= 60) return 'text-amber-600 bg-amber-500/10'
    return 'text-red-600 bg-red-500/10'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
          <Fingerprint className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Fund Similarity Finder</h2>
          <p className="text-sm text-muted-foreground">Find similar funds for diversification or alternatives</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedFundId} onValueChange={setSelectedFundId}>
            <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Select a fund to find similar ones..." /></SelectTrigger>
            <SelectContent>{funds.map(f => <SelectItem key={f.id} value={f.id}>{f.schemeName}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {sourceFund && (
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Finding alternatives to</p>
            <p className="font-bold text-lg">{sourceFund.schemeName}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{sourceFund.category}</Badge>
              <Badge variant="outline">{sourceFund.subCategory}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Finding similar funds...</p></CardContent></Card>}

      <div className="grid gap-4 sm:grid-cols-2">
        {similar.map((f, i) => (
          <Card key={f.id} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 flex items-center justify-center">
              <div className={`absolute inset-0 ${i === 0 ? 'bg-emerald-500' : 'bg-muted'} opacity-10 rounded-bl-[2rem]`} />
            </div>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{f.schemeName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" />{f.fundHouse}
                    {f.sameFundHouse && <Badge variant="outline" className="text-[9px] py-0 px-1 ml-1">Same AMC</Badge>}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-sm font-bold ${getScoreColor(f.similarityScore)}`}>
                  {f.similarityScore}%
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">1Y Return</span><p className="font-medium">{formatPercent(f.directReturn1y)}</p></div>
                <div><span className="text-muted-foreground">3Y Return</span><p className="font-medium">{formatPercent(f.directReturn3y)}</p></div>
                <div><span className="text-muted-foreground">Exp Ratio</span><p className="font-medium">{f.directExpenseRatio}%</p></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>AUM: {formatAUM(f.aumCrore)}</span>
                <Badge variant="outline" className="text-[9px]">{f.riskometer}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
