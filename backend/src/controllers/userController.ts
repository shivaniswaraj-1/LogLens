import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';

export const list = asyncHandler(async (req: Request, res: Response) => {
  // Everyone needs the id/name list to pick an assignee, but email addresses
  // are personal data that only admins should see.
  const isAdmin = req.user?.role === 'ADMIN';
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, email: isAdmin },
    orderBy: { name: 'asc' },
  });
  res.status(200).json({ users });
});
