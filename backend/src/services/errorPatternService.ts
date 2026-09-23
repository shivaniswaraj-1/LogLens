import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { ErrorPatternQuery } from '../validators/errorPatternValidators';

export async function listErrorPatterns(query: ErrorPatternQuery) {
  const where: Prisma.ErrorPatternWhereInput = {};
  if (query.service) where.service = query.service;

  const orderBy: Prisma.ErrorPatternOrderByWithRelationInput =
    query.sort === 'recent' ? { lastSeenAt: 'desc' } : { occurrenceCount: 'desc' };

  const [total, items] = await prisma.$transaction([
    prisma.errorPattern.count({ where }),
    prisma.errorPattern.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { _count: { select: { incidents: true } } },
    }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function getErrorPatternById(id: string) {
  const pattern = await prisma.errorPattern.findUnique({
    where: { id },
    include: { incidents: true, _count: { select: { logs: true } } },
  });
  if (!pattern) throw ApiError.notFound('Error pattern not found');
  return pattern;
}

export async function listLogsForPattern(id: string, page: number, pageSize: number) {
  const pattern = await prisma.errorPattern.findUnique({ where: { id } });
  if (!pattern) throw ApiError.notFound('Error pattern not found');

  const [total, items] = await prisma.$transaction([
    prisma.log.count({ where: { errorPatternId: id } }),
    prisma.log.findMany({
      where: { errorPatternId: id },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
