import { prisma } from '../../config/prisma';

export async function resetDatabase(): Promise<void> {
  await prisma.incidentEvent.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.log.deleteMany();
  await prisma.errorPattern.deleteMany();
  await prisma.uploadBatch.deleteMany();
  await prisma.user.deleteMany();
}
