import { database } from "../firebase";
import { ref, get, runTransaction, onValue } from "firebase/database";

// Get current stats
export const getStats = async () => {
  const snapshot = await get(ref(database, "stats"));

  if (snapshot.exists()) {
    return snapshot.val();
  }

  return {
    predictionCount: 0,
    pdfDownloadCount: 0,
  };
};

// Increment prediction counter safely
export const incrementPredictionCount = async () => {
  await runTransaction(ref(database, "stats"), (currentData) => {
    if (currentData === null) {
      return {
        predictionCount: 1,
        pdfDownloadCount: 0,
      };
    }

    return {
      ...currentData,
      predictionCount: (currentData.predictionCount || 0) + 1,
    };
  });
};

// Increment PDF counter safely
export const incrementPdfDownloadCount = async () => {
  await runTransaction(ref(database, "stats"), (currentData) => {
    if (currentData === null) {
      return {
        predictionCount: 0,
        pdfDownloadCount: 1,
      };
    }

    return {
      ...currentData,
      pdfDownloadCount: (currentData.pdfDownloadCount || 0) + 1,
    };
  });
};
export const subscribeToStats = (callback: (stats: any) => void) => {
  const statsRef = ref(database, "stats");

  return onValue(statsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({
        predictionCount: 0,
        pdfDownloadCount: 0,
      });
    }
  });
};