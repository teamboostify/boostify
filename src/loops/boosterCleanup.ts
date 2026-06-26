import { prisma } from "../libs/database.js"

export default {
  runEvery: 60, // seconds
  async execute() {
    await prisma.booster.deleteMany({
      where: {
        boostCounts: {
          lt: 1 // delete all boosters' data in which boost counts is 0
        }
      }
    })
  }
}