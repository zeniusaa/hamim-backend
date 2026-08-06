// Smoke test — alur paling dasar yang HARUS selalu jalan:
// server bisa start, DB bisa diakses, register → login → akses protected endpoint.
//
// Cara jalan:
//   npm test            (atau)   node --test tests/
//
// Catatan: test ini butuh MySQL hidup (DATABASE_URL di .env) — sama seperti
// server dev. User test dibuat & dihapus sendiri (soft-delete tidak dipakai,
// langsung dihapus permanen supaya DB tetap bersih).
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const path = require('node:path')

const PORT = 3456
const BASE = `http://localhost:${PORT}`
const ROOT = path.join(__dirname, '..')

let serverProcess
let testUserId = null
let accessToken = null

// Spawn server sekali untuk semua test di file ini (lebih cepat daripada
// start/stop per test). Port 3456 dipakai khusus test biar tidak bentrok
// dengan server dev di 3000.
before(async () => {
  serverProcess = spawn(process.execPath, ['src/app.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  // Tunggu sampai server siap (muncul pesan "berjalan" di stdout)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout menunggu server start')), 15000)
    serverProcess.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('HAMIM Backend berjalan')) {
        clearTimeout(timeout)
        resolve()
      }
    })
    serverProcess.on('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Server exit sebelum siap (code ${code})`))
    })
  })
})

after(async () => {
  // Bersihkan user test dari DB (langsung, bukan soft-delete)
  if (testUserId) {
    try {
      const { prisma } = require('../src/config/database')
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
      await prisma.$disconnect()
    } catch { /* DB mungkin sudah mati, abaikan */ }
  }
  if (serverProcess) serverProcess.kill()
})

const api = async (method, url, { token, body } = {}) => {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch { /* body bukan JSON */ }
  return { status: res.status, json }
}

test('GET /health → server hidup & DB terkoneksi', async () => {
  const { status, json } = await api('GET', '/health')
  assert.equal(status, 200)
  assert.equal(json.status, 'OK')
  assert.equal(json.database, 'OK')
})

test('POST /auth/register → user baru + accessToken', async () => {
  const email = `smoketest_${Date.now()}@example.com`
  const { status, json } = await api('POST', '/auth/register', {
    body: {
      name: 'Smoke Test',
      email,
      phone_number: `08${String(Date.now()).slice(-10)}`,
      password: 'Test1234!',
      language_code: 'id',
    },
  })
  assert.ok([200, 201].includes(status), `register harus 200/201, dapat ${status}`)
  assert.equal(json.success, true)

  testUserId = json.data.user?.id ?? json.data.id
  accessToken = json.data.accessToken
})

test('GET /auth/me → pakai accessToken, data user balik', async () => {
  assert.ok(accessToken, 'butuh token dari test register')
  const { status, json } = await api('GET', '/auth/me', { token: accessToken })
  assert.equal(status, 200)
  assert.equal(json.success, true)
  assert.ok(json.data.email)
})

test('GET /lives → status nyawa (protected endpoint)', async () => {
  assert.ok(accessToken, 'butuh token dari test register')
  const { status, json } = await api('GET', '/lives', { token: accessToken })
  assert.equal(status, 200)
  assert.equal(json.success, true)
  assert.ok('current_lives' in json.data || json.data.unlimited === true)
})

test('endpoint tanpa token → 401', async () => {
  const { status } = await api('GET', '/lives')
  assert.equal(status, 401)
})

test('GET /unknown-route → 404 JSON rapi', async () => {
  const { status, json } = await api('GET', '/tidak-ada-endpoint')
  assert.equal(status, 404)
  assert.equal(json.success, false)
})
