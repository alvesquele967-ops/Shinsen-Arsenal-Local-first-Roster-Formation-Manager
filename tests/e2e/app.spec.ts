import { expect, test } from '@playwright/test'
import { stat } from 'node:fs/promises'

test('日本語ホームと更新確認が動作する', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ホーム', exact: true })).toBeVisible()
  await expect(page.getByText('所持武将から、')).toBeVisible()
  await expect(page.locator('.banner-portraits img')).toHaveCount(3)
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('.banner-portraits img')].every((image) => image.complete))
  await page.getByRole('button', { name: '更新を確認' }).click()
  await expect(page.getByRole('status')).toContainText('最新')
})

test('公式共有リンクから武将・凸数・戦法をプレビューして統合できる', async ({ page }) => {
  await page.route('**/api/qookka-snapshot?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: [
        { selector: { data_view_type: 'hero' }, player_data: { heros: [{ type: 10001, stage: 3, hero_name: '織田信長' }] } },
        { selector: { data_view_type: 'skill' }, player_data: { skills: [{ id: 20001, skill_name: '新生' }] } },
      ] }),
    })
  })
  await page.goto('/')
  await page.getByLabel('公式共有URL').fill('https://general.qookkagames.com/xzdyw-station-qookka#/handbook?snapshot_id=6a091c97fb8d1ceae2fe1a78')
  await page.getByRole('button', { name: 'データを確認' }).click()
  await expect(page.locator('.import-preview')).toContainText('1')
  await page.getByRole('button', { name: '現在のデータと統合' }).click()
  await page.goto('/heroes')
  await page.getByLabel('所持状況').selectOption('owned')
  await expect(page.locator('.hero-card').filter({ hasText: '織田信長' })).toContainText('3凸')
})

test('武将検索・所持登録・再読み込み永続化が動作する', async ({ page }) => {
  await page.goto('/heroes')
  await page.getByPlaceholder('武将名・読みで検索').fill('オダ ノブナガ')
  const card = page.locator('.hero-card').filter({ hasText: '織田信長' })
  await expect(card).toHaveCount(1)
  await card.locator('.cycle-button').click()
  await expect(card).toContainText('0凸')
  await page.reload()
  await page.getByPlaceholder('武将名・読みで検索').fill('織田信長')
  await expect(page.locator('.hero-card').filter({ hasText: '織田信長' })).toContainText('0凸')
  await page.getByLabel('所持状況').selectOption('owned')
  await expect(page.locator('.hero-card')).toHaveCount(1)
})

test('器術Ⅲで武将を絞り込める', async ({ page }) => {
  await page.goto('/heroes')
  await page.getByLabel('器術').selectOption('3')
  await expect(page.locator('.hero-card')).not.toHaveCount(0)
  await expect(page.locator('.hero-card .art-mark').first()).toHaveText('器術Ⅲ')
  const marks = await page.locator('.hero-card .art-mark').allTextContents()
  expect(new Set(marks)).toEqual(new Set(['器術Ⅲ']))
})

test('3名を登録して編成保存し、バックアップを書き出せる', async ({ page }) => {
  await page.goto('/heroes')
  for (const name of ['織田信長', '上杉謙信', '武田信玄']) {
    await page.getByPlaceholder('武将名・読みで検索').fill(name)
    await page.locator('.hero-card').filter({ hasText: name }).locator('.cycle-button').click()
  }
  await page.goto('/formations')
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole('button', { name: '武将を選択' }).first().click()
    await page.locator('.picker-grid button').first().click()
  }
  await page.getByLabel('編成名').fill('自動検証隊')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.formation-list-item')).toContainText('自動検証隊')

  let portraitRequests = 0
  await page.route('**/api/portrait?**', async (route) => {
    portraitRequests += 1
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect width="120" height="160" fill="#b89b55"/></svg>',
    })
  })
  const pngPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PNG', exact: true }).click()
  const png = await pngPromise
  await expect(page.getByRole('status')).toContainText('武将画像 3名')
  expect(portraitRequests).toBe(3)
  expect(png.suggestedFilename()).toBe('自動検証隊.png')
  expect((await stat((await png.path())!)).size).toBeGreaterThan(10_000)

  await page.goto('/backup')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'バックアップを書き出す' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.shinsen\.json$/)
  const path = await download.path()
  expect(path).toBeTruthy()

  await page.goto('/settings')
  page.once('dialog', (dialog) => dialog.accept())
  const resetReload = page.waitForEvent('load')
  await page.getByRole('button', { name: 'ローカルデータを初期化' }).click()
  await resetReload
  await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible()

  await page.goto('/backup')
  await page.locator('input[type=file]').setInputFiles(path!)
  await expect(page.getByText('読み込みプレビュー')).toBeVisible()
  await expect(page.locator('.preview-counts')).toContainText('3')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '現在のデータを置き換える' }).click()
  await expect(page.getByRole('status')).toContainText('置き換えました')
  await page.goto('/heroes')
  await page.getByLabel('所持状況').selectOption('owned')
  await expect(page.locator('.hero-card')).toHaveCount(3)
  await page.goto('/formations')
  await expect(page.locator('.formation-list-item')).toContainText('自動検証隊')
})

test('主要画面をモバイル幅でも操作できる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/heroes')
  await expect(page.locator('.bottom-nav')).toBeVisible()
  await expect(page.locator('.hero-grid')).toBeVisible()
  await page.locator('.bottom-nav').getByText('設定', { exact: true }).click()
  await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible()
})
