// Replaces blank/unknown authors with the URL hostname.
// Run with: node scripts/fix-unknown-authors.mjs

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function authorFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

async function main() {
  const links = await prisma.link.findMany({
    where: {
      OR: [
        { author: null },
        { author: '' },
        { author: 'Unknown Author' },
      ],
    },
    select: { id: true, url: true, author: true },
  })

  let updated = 0
  let skipped = 0

  for (const link of links) {
    const author = authorFromUrl(link.url)
    if (!author) {
      skipped++
      continue
    }

    await prisma.link.update({
      where: { id: link.id },
      data: { author },
    })
    updated++
  }

  console.log(`Updated ${updated} links`)
  console.log(`Skipped ${skipped} links with invalid URLs`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
