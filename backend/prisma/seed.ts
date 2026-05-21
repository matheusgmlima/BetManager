import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding defaults...')

  // ─── Default Sports (globais, isDefault=true, userId=null) ────────────────
  const sports = [
    { name: 'Futebol',           icon: '⚽' },
    { name: 'Basquete',          icon: '🏀' },
    { name: 'Tênis',             icon: '🎾' },
    { name: 'MMA / UFC',         icon: '🥊' },
    { name: 'Futebol Americano', icon: '🏈' },
    { name: 'Outros',            icon: '🎯' },
  ]

  for (const s of sports) {
    const exists = await prisma.sport.findFirst({ where: { name: s.name, isDefault: true } })
    if (!exists) {
      await prisma.sport.create({ data: { ...s, isDefault: true, userId: null } })
    }
  }

  // ─── Default Bookmakers (globais, isDefault=true, userId=null) ────────────
  const bookmakers = [
    { name: 'Bet365',      color: '#007B5E' },
    { name: 'Betano',      color: '#FF6B35' },
    { name: 'Sportingbet', color: '#16213E' },
    { name: 'KTO',         color: '#C8A217' },
    { name: 'Superbet',    color: '#E63946' },
    { name: 'Betfair',     color: '#FFCC00' },
  ]

  for (const b of bookmakers) {
    const exists = await prisma.bookmaker.findFirst({ where: { name: b.name, isDefault: true } })
    if (!exists) {
      await prisma.bookmaker.create({ data: { ...b, isDefault: true, userId: null } })
    }
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
