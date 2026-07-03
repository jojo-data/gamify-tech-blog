import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { safeFileName, writeNoteToVault } from './vault'

function tmpVault(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-'))
}

test('safeFileName 替换非法字符并截断', () => {
  expect(safeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j')
  expect(safeFileName('长'.repeat(100))).toHaveLength(80)
})

test('目录不存在时自动创建', async () => {
  const vault = path.join(tmpVault(), '子目录', '博客游戏')
  const target = await writeNoteToVault(vault, '标题', 1, 'note-id: 1\n正文')
  expect(fs.readFileSync(target, 'utf8')).toContain('正文')
  expect(target).toBe(path.join(vault, '标题.md'))
})

test('重复导出同一笔记：覆盖自己的文件（幂等）', async () => {
  const vault = tmpVault()
  const first = await writeNoteToVault(vault, '标题', 1, 'note-id: 1\n版本一')
  const second = await writeNoteToVault(vault, '标题', 1, 'note-id: 1\n版本二')
  expect(second).toBe(first)
  expect(fs.readFileSync(first, 'utf8')).toContain('版本二')
  expect(fs.readdirSync(vault)).toHaveLength(1)
})

test('同名但不属于本笔记的文件不覆盖，改用带 noteId 的文件名', async () => {
  const vault = tmpVault()
  fs.writeFileSync(path.join(vault, '标题.md'), '用户自己的旧笔记', 'utf8')
  const target = await writeNoteToVault(vault, '标题', 5, 'note-id: 5\n新内容')
  expect(target).toBe(path.join(vault, '标题-n5.md'))
  expect(fs.readFileSync(path.join(vault, '标题.md'), 'utf8')).toBe('用户自己的旧笔记')
  expect(fs.readFileSync(target, 'utf8')).toContain('新内容')
})
