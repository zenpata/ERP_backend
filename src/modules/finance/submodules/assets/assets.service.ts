import { eq, and, lte } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { ConflictError } from '../../../../shared/middleware/error.middleware'
import { fixedAssets, assetDepreciationSchedule } from '../../finance.schema'
import { JournalService } from '../gl/journal.service'
import { Decimal } from 'decimal.js'

export type CreateFixedAssetInput = {
  assetNo?: string
  name: string
  category?: string
  acquisitionDate: string
  cost: string
  salvageValue?: string
  usefulLifeMonths: number
  depreciationMethod?: 'straight_line' | 'declining_balance'
  assetAccountId: string
  accumDepAccountId: string
  depExpenseAccountId: string
  notes?: string
}

export const AssetsService = {
  async listAssets(query?: { status?: string; category?: string }) {
    const filters = []
    if (query?.status) filters.push(eq(fixedAssets.status, query.status))
    if (query?.category) filters.push(eq(fixedAssets.category, query.category))

    return db.query.fixedAssets.findMany({
      where: filters.length ? and(...filters) : undefined,
    })
  },

  async getAsset(id: string) {
    return db.query.fixedAssets.findFirst({ where: eq(fixedAssets.id, id) })
  },

  async createAsset(input: CreateFixedAssetInput, userId: string) {
    const assetId = crypto.randomUUID()
    const assetNo = input.assetNo || `ASSET-${Date.now()}`

    const [dup] = await db.select({ id: fixedAssets.id }).from(fixedAssets).where(eq(fixedAssets.assetNo, assetNo)).limit(1)
    if (dup) throw new ConflictError('ASSET_NO_DUPLICATE', 'Asset number already exists', { assetNo: 'Duplicate asset number' })

    await db.insert(fixedAssets).values({
      id: assetId,
      assetNo,
      name: input.name,
      category: input.category,
      acquisitionDate: input.acquisitionDate,
      acquisitionCost: input.cost,
      salvageValue: input.salvageValue || '0',
      usefulLifeMonths: input.usefulLifeMonths,
      depreciationMethod: input.depreciationMethod || 'straight_line',
      assetAccountId: input.assetAccountId,
      accumDepAccountId: input.accumDepAccountId,
      depExpenseAccountId: input.depExpenseAccountId,
      notes: input.notes,
      status: 'active',
      createdBy: userId,
    })

    // Generate depreciation schedule
    const scheduleRows = this.generateDepreciationSchedule(
      assetId,
      new Decimal(input.cost),
      new Decimal(input.salvageValue || '0'),
      input.usefulLifeMonths,
      input.depreciationMethod || 'straight_line',
      new Date(input.acquisitionDate)
    )

    if (scheduleRows.length > 0) {
      await db.insert(assetDepreciationSchedule).values(scheduleRows)
    }

    return this.getAsset(assetId)
  },

  async updateAsset(id: string, input: Partial<CreateFixedAssetInput>, userId: string) {
    const updates: Record<string, unknown> = {}
    if (input.name) updates.name = input.name
    if (input.category) updates.category = input.category
    if (input.notes !== undefined) updates.notes = input.notes
    if (input.assetAccountId) updates.assetAccountId = input.assetAccountId
    if (input.accumDepAccountId) updates.accumDepAccountId = input.accumDepAccountId
    if (input.depExpenseAccountId) updates.depExpenseAccountId = input.depExpenseAccountId
    updates.updatedAt = new Date()

    if (Object.keys(updates).length === 0) return this.getAsset(id)

    await db.update(fixedAssets).set(updates).where(eq(fixedAssets.id, id))
    return this.getAsset(id)
  },

  async getDepreciationSchedule(assetId: string) {
    return db.query.assetDepreciationSchedule.findMany({
      where: eq(assetDepreciationSchedule.assetId, assetId),
    })
  },

  async disposeAsset(id: string, disposalDate: string, proceedsAmount: string, userId: string) {
    const asset = await this.getAsset(id)
    if (!asset) throw new Error('Asset not found')

    // Get latest NBV from schedule
    const lastSchedule = await db.query.assetDepreciationSchedule.findFirst({
      where: eq(assetDepreciationSchedule.assetId, id),
    })

    const nbv = lastSchedule?.nbv ? new Decimal(lastSchedule.nbv) : new Decimal(asset.acquisitionCost)
    const proceeds = new Decimal(proceedsAmount)
    const gainLoss = proceeds.minus(nbv)

    // Update asset
    await db
      .update(fixedAssets)
      .set({
        status: 'disposed',
        disposalDate,
        disposalProceeds: proceedsAmount,
        updatedAt: new Date(),
      })
      .where(eq(fixedAssets.id, id))

    return { success: true, gainLoss: gainLoss.toString() }
  },

  generateDepreciationSchedule(
    assetId: string,
    cost: Decimal,
    salvage: Decimal,
    usefulLifeMonths: number,
    method: string,
    startDate: Date
  ) {
    const scheduleRows: typeof assetDepreciationSchedule.$inferInsert[] = []
    const depreciableAmount = cost.minus(salvage)
    const monthlyAmount =
      method === 'straight_line' ? depreciableAmount.dividedBy(usefulLifeMonths) : null

    let currentNBV = cost
    let currentDate = new Date(startDate)
    currentDate.setDate(1)
    currentDate.setMonth(currentDate.getMonth() + 1)

    for (let i = 1; i <= usefulLifeMonths; i++) {
      const depreciation =
        method === 'straight_line'
          ? monthlyAmount!.toString()
          : currentNBV.times(new Decimal(1).dividedBy(usefulLifeMonths)).toString()

      const accumDep = cost.minus(currentNBV)
      currentNBV = currentNBV.minus(depreciation)

      // Get last day of month for period date
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const periodDate = lastDayOfMonth.toISOString().split('T')[0] ?? lastDayOfMonth.toISOString()
      scheduleRows.push({
        id: crypto.randomUUID(),
        assetId,
        periodDate,
        depAmount: depreciation,
        accumDep: accumDep.toString(),
        nbv: currentNBV.toString(),
        status: 'scheduled',
      })

      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return scheduleRows
  },

  async runMonthlyDepreciation() {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] ?? today.toISOString()

    const pendingRows = await db.query.assetDepreciationSchedule.findMany({
      where: and(
        eq(assetDepreciationSchedule.status, 'scheduled'),
        lte(assetDepreciationSchedule.periodDate, todayStr)
      ),
    })

    for (const row of pendingRows) {
      const asset = await this.getAsset(row.assetId)
      if (!asset) continue

      try {
        if (!asset.depExpenseAccountId || !asset.accumDepAccountId) {
          console.error(`Asset ${asset.name} missing GL accounts — skipping depreciation`)
          continue
        }

        const result = await JournalService.createDraft({
          date: todayStr,
          description: `Monthly depreciation: ${asset.name}`,
          referenceNo: asset.id,
          lines: [
            {
              accountId: asset.depExpenseAccountId,
              debit: row.depAmount,
              credit: '0',
              description: `Depreciation expense — ${asset.name}`,
            },
            {
              accountId: asset.accumDepAccountId,
              debit: '0',
              credit: row.depAmount,
              description: `Accumulated depreciation — ${asset.name}`,
            },
          ],
        })

        await JournalService.postEntry(result.entry.id, '')

        await db
          .update(assetDepreciationSchedule)
          .set({ status: 'posted', journalId: result.entry.id })
          .where(eq(assetDepreciationSchedule.id, row.id))
      } catch (err) {
        console.error(`Failed to post depreciation for ${asset.name}:`, err)
      }
    }
  },
}
