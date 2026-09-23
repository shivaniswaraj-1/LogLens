import { Prisma, UploadSource } from '@prisma/client';
import { prisma } from '../config/prisma';
import { parseLogText } from '../parsers/logParser';
import { buildPatternSignature } from './errorGrouping';
import { ParsedLogEntry } from '../types/log';

const PATTERN_LEVELS = new Set(['ERROR', 'FATAL']);

interface GroupedPattern {
  signature: string;
  service: string;
  sampleMessage: string;
  count: number;
  minTimestamp: Date;
  maxTimestamp: Date;
}

export interface IngestOptions {
  source: UploadSource;
  filename?: string;
  userId?: string;
}

export interface IngestSummary {
  batchId: string;
  totalLines: number;
  parsedCount: number;
  skippedCount: number;
  newErrorPatterns: number;
  updatedErrorPatterns: number;
  sampleFailures: { lineNumber: number; rawLine: string; reason: string }[];
}

function groupPatterns(entries: ParsedLogEntry[]): Map<string, GroupedPattern> {
  const groups = new Map<string, GroupedPattern>();

  for (const entry of entries) {
    if (!PATTERN_LEVELS.has(entry.level)) continue;
    const signature = buildPatternSignature(entry.service, entry.message);
    const existing = groups.get(signature);
    if (existing) {
      existing.count += 1;
      if (entry.timestamp < existing.minTimestamp) existing.minTimestamp = entry.timestamp;
      if (entry.timestamp > existing.maxTimestamp) existing.maxTimestamp = entry.timestamp;
    } else {
      groups.set(signature, {
        signature,
        service: entry.service,
        sampleMessage: entry.message,
        count: 1,
        minTimestamp: entry.timestamp,
        maxTimestamp: entry.timestamp,
      });
    }
  }

  return groups;
}

export async function ingestLogText(text: string, options: IngestOptions): Promise<IngestSummary> {
  const { entries, failures, totalLines } = parseLogText(text);
  const grouped = groupPatterns(entries);

  const result = await prisma.$transaction(
    async (tx) => {
      const batch = await tx.uploadBatch.create({
        data: {
          filename: options.filename,
          source: options.source,
          lineCount: totalLines,
          parsedCount: entries.length,
          skippedCount: failures.length,
          uploadedById: options.userId,
        },
      });

      const signatureToPatternId = new Map<string, string>();
      let newErrorPatterns = 0;
      let updatedErrorPatterns = 0;

      for (const group of grouped.values()) {
        const existingPattern = await tx.errorPattern.findUnique({ where: { signature: group.signature } });
        if (existingPattern) {
          const updated = await tx.errorPattern.update({
            where: { id: existingPattern.id },
            data: {
              occurrenceCount: { increment: group.count },
              firstSeenAt:
                group.minTimestamp < existingPattern.firstSeenAt ? group.minTimestamp : existingPattern.firstSeenAt,
              lastSeenAt:
                group.maxTimestamp > existingPattern.lastSeenAt ? group.maxTimestamp : existingPattern.lastSeenAt,
            },
          });
          signatureToPatternId.set(group.signature, updated.id);
          updatedErrorPatterns += 1;
        } else {
          const created = await tx.errorPattern.create({
            data: {
              signature: group.signature,
              service: group.service,
              sampleMessage: group.sampleMessage,
              occurrenceCount: group.count,
              firstSeenAt: group.minTimestamp,
              lastSeenAt: group.maxTimestamp,
            },
          });
          signatureToPatternId.set(group.signature, created.id);
          newErrorPatterns += 1;
        }
      }

      if (entries.length > 0) {
        const data: Prisma.LogCreateManyInput[] = entries.map((entry) => {
          const signature = PATTERN_LEVELS.has(entry.level)
            ? buildPatternSignature(entry.service, entry.message)
            : null;
          return {
            timestamp: entry.timestamp,
            level: entry.level,
            service: entry.service,
            message: entry.message,
            rawLine: entry.rawLine,
            requestId: entry.requestId,
            traceId: entry.traceId,
            lineNumber: entry.lineNumber,
            uploadBatchId: batch.id,
            errorPatternId: signature ? signatureToPatternId.get(signature) ?? null : null,
          };
        });

        await tx.log.createMany({ data });
      }

      return { batch, newErrorPatterns, updatedErrorPatterns };
    },
    // A large upload (up to MAX_UPLOAD_SIZE_BYTES) can contain tens of
    // thousands of lines; Prisma's default interactive-transaction timeout
    // (5s) is tuned for short request/response transactions and can be too
    // tight for a bulk ingest, especially against a higher-latency managed
    // database. 30s gives real headroom without masking a truly stuck query.
    { timeout: 30_000 },
  );

  return {
    batchId: result.batch.id,
    totalLines,
    parsedCount: entries.length,
    skippedCount: failures.length,
    newErrorPatterns: result.newErrorPatterns,
    updatedErrorPatterns: result.updatedErrorPatterns,
    sampleFailures: failures.slice(0, 20),
  };
}
