import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const config = LA_ROCCA_CONFIG;

const firebaseReady =
  config.firebaseConfig?.apiKey &&
  !config.firebaseConfig.apiKey.includes("PASTE");

window.LA_ROCCA_LIVE_STATE = {
  manualStatus: "automatic",
  announcement: {
    es: "",
    en: ""
  }
};

if (firebaseReady) {
  const app = initializeApp(config.firebaseConfig);
  const db = getFirestore(app);
  const statusRef = doc(db, "gym", "status");

  onSnapshot(
    statusRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        window.LA_ROCCA_LIVE_STATE = {
          manualStatus: "automatic",
          announcement: {
            es: "",
            en: ""
          }
        };

        window.dispatchEvent(
          new Event("la-roca-live-update")
        );

        return;
      }

      const data = snapshot.data();

      window.LA_ROCCA_LIVE_STATE = {
        manualStatus: data.manualStatus || "automatic",

        temporaryClosedStartedAt:
          data.temporaryClosedStartedAt
            ?.toDate?.() || null,

        closedUntil:
          data.closedUntil
            ?.toDate?.() || null,

        announcement:
          data.announcement || {
            es: "",
            en: ""
          }
      };

      window.dispatchEvent(
        new Event("la-roca-live-update")
      );
    },
    (error) => {
      console.error(
        "La Roca Firebase error:",
        error
      );
    }
  );
}
      const data = snapshot.data();

      let manualStatus = data.manualStatus || "automatic";

      // Temporary closure expires after 2 hours.
      if (manualStatus === "temporaryClosed") {
        const startedAt =
          data.temporaryClosedStartedAt?.toDate?.() || null;

        const active =
          startedAt &&
          Date.now() - startedAt.getTime() < 2 * 60 * 60 * 1000;

        if (!active) {
          manualStatus = "automatic";
        }
      }

      // Closed status expires at midnight Dominican Republic time.
      if (manualStatus === "closed") {
        const closedUntil =
          data.closedUntil?.toDate?.() || null;

        if (closedUntil && Date.now() >= closedUntil.getTime()) {
          manualStatus = "automatic";
        }
      }

      window.LA_ROCA_LIVE_STATE = {
        manualStatus,
        temporaryClosed:
          manualStatus === "temporaryClosed",
        announcement:
          data.announcement || {
            en: "",
            es: ""
          }
      };

      window.dispatchEvent(
        new Event("la-roca-live-update")
      );
    },
    console.error
  );
}
