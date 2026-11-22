const { Queue, Worker } = require('bullmq');
const redisConfig = require('../config/redis');

// Initialize queue only if Redis is available
let quizGradingQueue = null;
let isQueueActive = false;

if (process.env.REDIS_URL && redisConfig.client) {
  try {
    quizGradingQueue = new Queue('quiz-grading', {
      connection: redisConfig.client
    });
    isQueueActive = true;
    console.log('[Queue] BullMQ quiz-grading queue initialized');
  } catch (error) {
    console.warn('[Queue] Failed to initialize queue (likely no Redis). Queueing disabled.');
  }
}

// Function to add jobs to the queue
const addQuizGradingJob = async (submissionData) => {
  if (!isQueueActive || redisConfig.client.status !== 'ready') {
    console.log('[Queue Bypass] Grading quiz synchronously (no Redis available)');
    return null; // Signals the controller to grade it inline
  }

  try {
    const job = await quizGradingQueue.add('grade-quiz', submissionData, {
      removeOnComplete: true,
      removeOnFail: false
    });
    return job.id;
  } catch (error) {
    console.error('[Queue Error] Failed to add grading job', error);
    return null; // Signals the controller to fall back to inline grading
  }
};

// Initialize worker to process the queue
let worker = null;

const initWorker = (processFunction) => {
  if (!isQueueActive) return;

  worker = new Worker('quiz-grading', async (job) => {
    console.log(`[Worker] Processing grading job ${job.id} for submission ${job.data.submissionId}`);
    try {
      await processFunction(job.data);
      console.log(`[Worker] Successfully graded submission ${job.data.submissionId}`);
    } catch (error) {
      console.error(`[Worker Error] Failed to grade submission ${job.data.submissionId}`, error);
      throw error;
    }
  }, { connection: redisConfig.client });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed with error:`, err);
  });
};

module.exports = {
  addQuizGradingJob,
  initWorker,
  isQueueActive
};
