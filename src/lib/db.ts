import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

/** Channel by id, youtubeId or handle (with or without '@'); no ref = first own channel. */
export async function findChannel(ref?: string) {
  const ch = ref
    ? await prisma.channel.findFirst({ where: { OR: [{ id: ref }, { youtubeId: ref }, { handle: ref.startsWith('@') ? ref : `@${ref}` }] } })
    : await prisma.channel.findFirst({ where: { isOwn: true }, orderBy: { createdAt: 'asc' } })
  if (!ch) throw new Error(`channel not found: ${ref ?? '(no own channel)'}`)
  return ch
}

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
