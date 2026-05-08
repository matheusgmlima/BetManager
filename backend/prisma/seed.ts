import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Sports
  await prisma.sport.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Futebol',   icon: '⚽' },
      { name: 'Basquete',  icon: '🏀' },
      { name: 'Tênis',     icon: '🎾' },
      { name: 'Fórmula 1', icon: '🏎️' },
      { name: 'MMA/UFC',   icon: '🥊' },
      { name: 'Voleibol',  icon: '🏐' },
      { name: 'Beisebol',  icon: '⚾' },
      { name: 'Hóquei',    icon: '🏒' },
      { name: 'Outro',     icon: '🎯' },
    ],
  })

  // Bookmakers
  await prisma.bookmaker.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Bet365',      color: '#007B5E' },
      { name: 'Superbet',    color: '#E63946' },
      { name: 'Betano',      color: '#FF6B35' },
      { name: 'Sportingbet', color: '#1A1A2E' },
      { name: 'KTO',         color: '#FFD700' },
      { name: 'Betfair',     color: '#FFD700' },
      { name: 'Pinnacle',    color: '#003087' },
      { name: 'Outros',      color: '#6B7280' },
    ],
  })

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
