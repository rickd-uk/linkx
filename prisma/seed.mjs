import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()


const categories = [
  { name: "AI", icon: "🤖" },
  { name: "Biology", icon: "🧬" },
  { name: "Brain Science", icon: "🧠" },
  { name: "Business", icon: "💼" },
  { name: "Chemistry", icon: "⚗️" },
  { name: "Computing", icon: "🖥️" },
  { name: "Culture", icon: "🎭" },
  { name: "Dev", icon: "💻" },
  { name: "Education", icon: "📚" },
  { name: "Entertainment", icon: "🎬" },
  { name: "Environment", icon: "🌿" },
  { name: "Film", icon: "🎥" },
  { name: "Finance", icon: "📈" },
  { name: "Fitness", icon: "💪" },
  { name: "Food", icon: "🍽️" },
  { name: "Gaming", icon: "🎮" },
  { name: "Guitar", icon: "🎸" },
  { name: "Health", icon: "🏥" },
  { name: "History", icon: "📜" },
  { name: "Music", icon: "🎵" },
  { name: "News", icon: "📰" },
  { name: "Philosophy", icon: "🧠" },
  { name: "Physics", icon: "⚛️" },
  { name: "Politics", icon: "🏛️" },
  { name: "Psychology", icon: "🧪" },
  { name: "Society", icon: "🌐" },
  { name: "Space", icon: "🚀" },
  { name: "Spicy", icon: "🌶️" },
  { name: "Sport", icon: "⚽" },
  { name: "Technology", icon: "💡" },
  { name: "Travel", icon: "✈️" },
  { name: "World", icon: "🌍" },
]

async function main() {
  console.log('Start seeding...')

  // Upsert categories (safe to run multiple times)
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { icon: category.icon },
      create: { name: category.name, icon: category.icon, isPublic: true },
    })
    console.log(`Upserted category: ${category.icon} ${category.name}`)
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
