// ============================================================
// match-engine.ts — Auto-match scoring engine for bank reconciliation
// Used to match statement lines against invoices and payments
// ============================================================

export type MatchResult = {
  matchStatus: 'exact' | 'probable' | 'unmatched'
  score: number
  invoiceId?: string
  invoiceNumber?: string
  confidence: number
}

export const MatchEngine = {
  /**
   * Score a bank statement line against an invoice
   * Returns match status and confidence score (0-100)
   */
  scoreMatch(
    statementLine: {
      amount: number
      description: string
      date: Date
      referenceNo?: string
    },
    invoice: {
      id: string
      invoiceNumber: string
      total: number
      issueDate: Date
      dueDate: Date
    }
  ): MatchResult {
    const scores: { criteria: string; weight: number; score: number }[] = []

    // Amount match (40% weight)
    const amountDiff = Math.abs(statementLine.amount - invoice.total)
    const amountScore = amountDiff === 0 ? 100 : amountDiff < 1 ? 90 : amountDiff < 10 ? 50 : 0
    scores.push({ criteria: 'amount', weight: 0.4, score: amountScore })

    // Date match: within 3 days of due date (25% weight)
    const daysDiff = Math.abs(
      (statementLine.date.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const dateScore =
      daysDiff === 0 ? 100 : daysDiff <= 3 ? 80 : daysDiff <= 7 ? 50 : daysDiff <= 30 ? 20 : 0
    scores.push({ criteria: 'date', weight: 0.25, score: dateScore })

    // Reference number match: invoice# in description/ref (20% weight)
    const refMatch =
      statementLine.referenceNo?.includes(invoice.invoiceNumber) ||
      statementLine.description.includes(invoice.invoiceNumber) ||
      statementLine.description.includes(invoice.invoiceNumber.replace(/^INV-/, ''))
    const refScore = refMatch ? 100 : 0
    scores.push({ criteria: 'reference', weight: 0.2, score: refScore })

    // Description hint (15% weight)
    const descMatch = statementLine.description.toLowerCase().includes('inv')
    const descScore = descMatch ? 50 : 0
    scores.push({ criteria: 'description', weight: 0.15, score: descScore })

    // Calculate weighted score
    const weightedScore = scores.reduce((sum, s) => sum + s.weight * s.score, 0)

    // Determine match status based on criteria
    let matchStatus: 'exact' | 'probable' | 'unmatched'
    if (amountScore === 100 && refScore === 100) {
      matchStatus = 'exact'
    } else if (amountScore >= 90 && dateScore >= 80) {
      matchStatus = 'probable'
    } else {
      matchStatus = 'unmatched'
    }

    return {
      matchStatus,
      score: weightedScore,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      confidence: Math.round(weightedScore),
    }
  },

  /**
   * Find best matches for a statement line across multiple invoices
   * Returns top N candidates sorted by score
   */
  findBestMatches(
    statementLine: {
      amount: number
      description: string
      date: Date
      referenceNo?: string
    },
    invoices: Array<{
      id: string
      invoiceNumber: string
      total: number
      issueDate: Date
      dueDate: Date
    }>,
    topN: number = 3
  ): MatchResult[] {
    return invoices
      .map((inv) => this.scoreMatch(statementLine, inv))
      .filter((m) => m.matchStatus !== 'unmatched')
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
  },

  /**
   * Batch process statement lines and find exact/probable matches
   */
  autoMatchBatch(
    statementLines: Array<{
      id: string
      amount: number
      description: string
      date: Date
      referenceNo?: string
    }>,
    invoices: Array<{
      id: string
      invoiceNumber: string
      total: number
      issueDate: Date
      dueDate: Date
    }>
  ): Map<
    string,
    {
      matchStatus: 'exact' | 'probable' | 'unmatched'
      invoiceId?: string
      invoiceNumber?: string
      confidence: number
    }
  > {
    const results = new Map<
      string,
      {
        matchStatus: 'exact' | 'probable' | 'unmatched'
        invoiceId?: string
        invoiceNumber?: string
        confidence: number
      }
    >()

    for (const line of statementLines) {
      const topMatch = this.findBestMatches(line, invoices, 1)[0]

      if (topMatch?.matchStatus === 'exact') {
        const r: { matchStatus: 'exact'; invoiceId?: string; invoiceNumber?: string; confidence: number } = {
          matchStatus: 'exact',
          confidence: topMatch.confidence,
        }
        if (topMatch.invoiceId) r.invoiceId = topMatch.invoiceId
        if (topMatch.invoiceNumber) r.invoiceNumber = topMatch.invoiceNumber
        results.set(line.id, r)
      } else if (topMatch?.matchStatus === 'probable') {
        const r: { matchStatus: 'probable'; invoiceId?: string; invoiceNumber?: string; confidence: number } = {
          matchStatus: 'probable',
          confidence: topMatch.confidence,
        }
        if (topMatch.invoiceId) r.invoiceId = topMatch.invoiceId
        if (topMatch.invoiceNumber) r.invoiceNumber = topMatch.invoiceNumber
        results.set(line.id, r)
      } else {
        results.set(line.id, {
          matchStatus: 'unmatched',
          confidence: 0,
        })
      }
    }

    return results
  },
}
