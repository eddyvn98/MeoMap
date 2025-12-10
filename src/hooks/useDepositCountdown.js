import { useEffect, useState } from 'react';

/**
 * Hook để tính countdown time cho deposits bị khóa
 * @param {Object} deposits - Map of deposits by requester_id
 * @returns {Object} Map of countdown strings by requester_id
 */
export const useDepositCountdown = (deposits) => {
  const [countdownMap, setCountdownMap] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      const newMap = {};
      
      Object.entries(deposits).forEach(([requesterId, depInfo]) => {
        if (depInfo?.locked_until) {
          const now = new Date();
          const lockEnd = new Date(depInfo.locked_until);
          const secondsLeft = Math.max(0, Math.floor((lockEnd - now) / 1000));

          if (secondsLeft > 0) {
            const days = Math.floor(secondsLeft / 86400);
            const hours = Math.floor((secondsLeft % 86400) / 3600);
            const mins = Math.floor((secondsLeft % 3600) / 60);
            const secs = secondsLeft % 60;

            if (days > 0) {
              newMap[requesterId] = `${days}d ${hours}h`;
            } else if (hours > 0) {
              newMap[requesterId] = `${hours}h ${mins}m`;
            } else {
              newMap[requesterId] = `${mins}m ${secs}s`;
            }
          } else {
            newMap[requesterId] = 'Hết hạn';
          }
        }
      });

      setCountdownMap(newMap);
    }, 1000);

    return () => clearInterval(timer);
  }, [deposits]);

  return countdownMap;
};
