// Hook to manage reminder scheduler
// Automatically processes pending reminders periodically

import { useEffect } from 'react';
import { processPendingReminders } from '../services/reminderScheduler';

/**
 * Hook to run reminder scheduler periodically
 * @param {number} intervalMs - Interval in milliseconds (default: 1 hour)
 */
export function useReminderScheduler(intervalMs = 60 * 60 * 1000) {
  useEffect(() => {
    // Run immediately on mount
    const runReminders = async () => {
      try {
        const result = await processPendingReminders();
        if (result.success && result.sent > 0) {
          console.log(`[REMINDER HOOK] Sent ${result.sent} reminders`);
        }
      } catch (error) {
        console.error('[REMINDER HOOK] Error running reminders:', error);
      }
    };

    // Initial run
    runReminders();

    // Set up interval
    const interval = setInterval(runReminders, intervalMs);

    // Cleanup
    return () => clearInterval(interval);
  }, [intervalMs]);
}

/**
 * Hook to run reminder scheduler once on mount
 */
export function useReminderSchedulerOnce() {
  useEffect(() => {
    const runReminders = async () => {
      try {
        const result = await processPendingReminders();
        if (result.success) {
          console.log(`[REMINDER HOOK] Processed ${result.processed} adoptions, sent ${result.sent} reminders`);
        }
      } catch (error) {
        console.error('[REMINDER HOOK] Error running reminders:', error);
      }
    };

    runReminders();
  }, []);
}
