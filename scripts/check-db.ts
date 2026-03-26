import prisma from "@/lib/prisma";

async function run() {
  try {
    const cols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user'
    `;
    console.log("COLUMNS IN 'user' TABLE:");
    console.log(JSON.stringify(cols, null, 2));
    
    const users = await prisma.$queryRaw`SELECT * FROM "user" LIMIT 1`;
    console.log("SAMPLE USER:");
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
