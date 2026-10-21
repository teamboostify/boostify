import { db } from "../prisma/db.js"

export default {
  schedule: "*/30 * * * *", // every 30 minutes
  async execute() {
    await db.orm.public.Booster.where((b) => b.boostCounts.lt(1)).deleteAll()
  }
}
