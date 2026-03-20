import { NextRequest } from 'next/server';
import { success, error } from '@/backend/utils/api-response';
import { rotationService, dynamicSecretService } from '@/backend/services';
import { db } from '@/lib/db';
import { calculateNextRunTime } from '@/lib/cron-utils';

/**
 * Cron endpoint for rotation jobs
 * Call this endpoint periodically (e.g., every minute) to process due rotation jobs
 *
 * POST /api/cron/rotation
 *
 * Or configure in vercel.json for Vercel Cron:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/rotation",
 *       "schedule": "* * * * *"
 *     }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Mandatory: require a secret key for authentication
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return error('Cron endpoint misconfigured — CRON_SECRET not set', 500);
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return error('Unauthorized', 401);
    }

    // Get all jobs due for rotation
    const dueJobs = await rotationService.getJobsDueForRotation();

    if (dueJobs.length === 0) {
      return success({ message: 'No jobs due for rotation', processed: 0 });
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      jobs: [] as Array<{ id: string; name: string; status: string; error?: string }>,
    };

    for (const job of dueJobs) {
      try {
        // Generate new credentials (result is stored in DB, we just trigger it)
        await dynamicSecretService.generateCredentials(
          job.dynamicSecretId,
          'system' // System user for automated rotations
        );

        // Get the created credential
        const createdCredential = await db.dynamicSecretCredential.findFirst({
          where: { dynamicSecretId: job.dynamicSecretId },
          orderBy: { createdAt: 'desc' },
        });

        // Calculate next run time
        const nextRunAt = calculateNextRunTime(job.cronExpression);

        // Update job with last run time
        await db.rotationJob.update({
          where: { id: job.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt,
          },
        });

        // Log the rotation
        await db.rotationLog.create({
          data: {
            rotationJobId: job.id,
            dynamicSecretId: job.dynamicSecretId,
            status: 'success',
            newCredentialId: createdCredential?.id,
            rotatedBy: 'automatic',
          },
        });

        results.succeeded++;
        results.jobs.push({ id: job.id, name: job.name, status: 'success' });
      } catch (jobError) {
        results.failed++;

        // Log the failed rotation
        await db.rotationLog.create({
          data: {
            rotationJobId: job.id,
            dynamicSecretId: job.dynamicSecretId,
            status: 'failed',
            errorMessage: jobError instanceof Error ? jobError.message : 'Unknown error',
            rotatedBy: 'automatic',
          },
        });

        results.jobs.push({
          id: job.id,
          name: job.name,
          status: 'failed',
          error: jobError instanceof Error ? jobError.message : 'Unknown error',
        });
      }

      results.processed++;
    }

    return success(results);
  } catch (err) {
    console.error('Cron rotation error:', err);
    return error('Internal server error', 500);
  }
}

/**
 * Health check for cron endpoint
 */
export async function GET() {
  return success({ status: 'ok', message: 'Rotation cron endpoint' });
}
