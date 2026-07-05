// Migrates links from old categories to new ones, adds current categories,
// and cleans up removed categories.
// Run with: node scripts/migrate-categories.mjs

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const categoriesToAdd = [
  { name: 'Computing', icon: '🖥️' },
  { name: 'Biology', icon: '🧬' },
  { name: 'Physics', icon: '⚛️' },
  { name: 'Chemistry', icon: '⚗️' },
  { name: 'Brain Science', icon: '🧠' },
]

const removedCategories = [
  'ASMR',
  'Design',
  'Law',
  'Photography',
  'Science',
]

async function main() {
  for (const category of categoriesToAdd) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { icon: category.icon, isPublic: true },
      create: { name: category.name, icon: category.icon, isPublic: true },
    })
    console.log(`Upserted category: ${category.icon} ${category.name}`)
  }

  // Rename Technology → Dev
  const techResult = await prisma.link.updateMany({
    where: { category: 'Technology' },
    data: { category: 'Dev' },
  })
  console.log(`Technology → Dev: ${techResult.count} links`)

  // Rename Conflict → World
  const conflictResult = await prisma.link.updateMany({
    where: { category: 'Conflict' },
    data: { category: 'World' },
  })
  console.log(`Conflict → World: ${conflictResult.count} links`)

  // Gaming has no equivalent — uncategorize those links
  const gamingResult = await prisma.link.updateMany({
    where: { category: 'Gaming' },
    data: { category: null, isPublic: false },
  })
  console.log(`Gaming → uncategorized (private): ${gamingResult.count} links`)

  for (const name of removedCategories) {
    const result = await prisma.link.updateMany({
      where: { category: name },
      data: { category: null, isPublic: false },
    })
    console.log(`${name} → uncategorized (private): ${result.count} links`)
  }

  // Delete removed categories from Category table
  const removed = ['Technology', 'Conflict', 'Gaming', ...removedCategories]
  for (const name of removed) {
    await prisma.category.deleteMany({ where: { name } })
    console.log(`Deleted category: ${name}`)
  }

  console.log('Migration complete.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
