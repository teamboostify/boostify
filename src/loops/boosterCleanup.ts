import { prisma } from "../libs/database.js"

export default {
  schedule: "*/30 * * * *", // every 30 minutes
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