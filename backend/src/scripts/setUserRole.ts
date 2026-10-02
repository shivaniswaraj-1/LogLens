// Usage: npm run user:role -- <email> <ADMIN|ENGINEER>
//
// Registration always creates ENGINEER accounts (letting the client pick its
// own role would defeat RBAC), so this is how the first admin is created.
// It talks to whatever DATABASE_URL points at — double-check it first.
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role || !(role in UserRole)) {
    console.error('Usage: npm run user:role -- <email> <ADMIN|ENGINEER>');
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: role as UserRole },
    select: { email: true, role: true },
  });
  console.log(`${user.email} is now ${user.role}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
