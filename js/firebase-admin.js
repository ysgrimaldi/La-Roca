import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const c = LA_ROCCA_CONFIG;

const warning =
  document.getElementById("setupWarning");

const ok =
  c.firebaseConfig?.apiKey &&
  !c.firebaseConfig.apiKey.includes("PASTE");

if (!ok) {
  warning.textContent =
    "Completa firebaseConfig en js/config.js.";

  warning.classList.remove("d-none");

  document.getElementById(
    "signInBtn"
  ).disabled = true;

} else {

  const app =
    initializeApp(c.firebaseConfig);

  const auth =
    getAuth(app);

  const db =
    getFirestore(app);

  const statusRef =
    doc(db, "gym", "status");

  const provider =
    new GoogleAuthProvider();

  let live = {};

  const feedback =
    (message) => {
      document.getElementById(
        "feedback"
      ).textContent = message;
    };

  const isAuthorized =
    (user) =>
      c.adminEmails
        .map(email =>
          email.toLowerCase()
        )
        .includes(
          (user?.email || "")
            .toLowerCase()
        );

  /*
   * Get the next midnight in
   * America/Santo_Domingo.
   */
  function getNextMidnight() {
    const now = new Date();

    const parts =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "America/Santo_Domingo",
          year: "numeric",
          month: "numeric",
          day: "numeric"
        }
      ).formatToParts(now);

    const values = {};

    parts.forEach(part => {
      if (part.type !== "literal") {
        values[part.type] =
          Number(part.value);
      }
    });

    /*
     * Dominican Republic is UTC-4.
     * Midnight tomorrow is therefore
     * 04:00 UTC.
     */
    return new Date(
      Date.UTC(
        values.year,
        values.month - 1,
        values.day + 1,
        4,
        0,
        0
      )
    );
  }

  /*
   * Update the gym's manual status.
   */
  async function setManualStatus(status) {
    try {

      const data = {
        manualStatus: status,
        updatedAt: serverTimestamp()
      };

      /*
       * Clear old temporary/closed
       * expiration fields by default.
       */
      data.temporaryClosed = false;
      data.temporaryClosedStartedAt = null;
      data.closedUntil = null;

      /*
       * Temporary closure:
       * expires 2 hours after activation.
       */
      if (status === "temporaryClosed") {
        data.temporaryClosed = true;
        data.temporaryClosedStartedAt =
          serverTimestamp();
      }

      /*
       * Normal closed:
       * expires at midnight Dominican
       * Republic time.
       */
      if (status === "closed") {
        data.closedUntil =
          Timestamp.fromDate(
            getNextMidnight()
          );
      }

      /*
       * Selecting Automatic clears
       * all manual overrides.
       */
      await setDoc(
        statusRef,
        data,
        { merge: true }
      );

      feedback(
        "Estado actualizado."
      );

    } catch (error) {
      console.error(error);

      feedback(
        "No se pudo actualizar el estado."
      );
    }
  }

  /*
   * Google sign-in.
   */
  document.getElementById(
    "signInBtn"
  ).onclick = () => {

    signInWithPopup(
      auth,
      provider
    ).catch(error => {
      console.error(error);
      feedback(error.message);
    });

  };

  /*
   * Sign out.
   */
  document.getElementById(
    "signOutBtn"
  ).onclick = () => {
    signOut(auth);
  };

  /*
   * Authentication state.
   */
  onAuthStateChanged(
    auth,
    user => {

      document
        .getElementById(
          "signedOutView"
        )
        .classList.toggle(
          "d-none",
          !!user
        );

      document
        .getElementById(
          "signOutBtn"
        )
        .classList.toggle(
          "d-none",
          !user
        );

      document
        .getElementById(
          "unauthorizedView"
        )
        .classList.add(
          "d-none"
        );

      document
        .getElementById(
          "dashboard"
        )
        .classList.add(
          "d-none"
        );

      if (user) {

        const target =
          isAuthorized(user)
            ? document.getElementById(
                "dashboard"
              )
            : document.getElementById(
                "unauthorizedView"
              );

        target.classList.remove(
          "d-none"
        );
      }
    }
  );

  /*
   * Listen for live gym status.
   */
  onSnapshot(
    statusRef,
    snapshot => {

      if (snapshot.exists()) {
        live = snapshot.data();
      } else {
        live = {};
      }

      let currentStatus =
        live.manualStatus ||
        "automatic";

      /*
       * Temporary closure expires
       * after 2 hours.
       */
      if (
        currentStatus ===
        "temporaryClosed"
      ) {

        const startedAt =
          live
            .temporaryClosedStartedAt
            ?.toDate?.() || null;

        if (
          !startedAt ||
          Date.now() -
            startedAt.getTime() >=
            2 * 60 * 60 * 1000
        ) {
          currentStatus =
            "automatic";
        }
      }

      /*
       * Closed status expires at
       * Dominican midnight.
       */
      if (
        currentStatus === "closed"
      ) {

        const closedUntil =
          live.closedUntil
            ?.toDate?.() || null;

        if (
          closedUntil &&
          Date.now() >=
            closedUntil.getTime()
        ) {
          currentStatus =
            "automatic";
        }
      }

      const labels = {
        automatic:
          "🟢 AUTOMÁTICO",

        cleaning:
          "🧹 EN LIMPIEZA",

        closed:
          "🔴 CERRADO",

        temporaryClosed:
          "⏳ TEMPORALMENTE CERRADO"
      };

      document.getElementById(
        "adminStatus"
      ).textContent =
        labels[currentStatus];

      /*
       * Highlight active button.
       */
      document
        .querySelectorAll(
          ".status-control"
        )
        .forEach(button => {
          button.classList.remove(
            "active"
          );
        });

      const activeButton = {
        automatic:
          "automaticBtn",

        cleaning:
          "cleaningBtn",

        closed:
          "closedBtn",

        temporaryClosed:
          "temporaryClosedBtn"
      }[currentStatus];

      if (activeButton) {
        document
          .getElementById(
            activeButton
          )
          .classList.add(
            "active"
          );
      }

      /*
       * Announcement fields.
       */
      document.getElementById(
        "announcementEs"
      ).value =
        live.announcement?.es || "";

      document.getElementById(
        "announcementEn"
      ).value =
        live.announcement?.en || "";
    }
  );

  /*
   * Status buttons.
   */
  document.getElementById(
    "automaticBtn"
  ).onclick = () =>
    setManualStatus(
      "automatic"
    );

  document.getElementById(
    "cleaningBtn"
  ).onclick = () =>
    setManualStatus(
      "cleaning"
    );

  document.getElementById(
    "closedBtn"
  ).onclick = () =>
    setManualStatus(
      "closed"
    );

  document.getElementById(
    "temporaryClosedBtn"
  ).onclick = () =>
    setManualStatus(
      "temporaryClosed"
    );

  /*
   * Save announcement.
   */
  document.getElementById(
    "saveAnnouncementBtn"
  ).onclick = async () => {

    try {

      await setDoc(
        statusRef,
        {
          announcement: {
            es: document
              .getElementById(
                "announcementEs"
              )
              .value
              .trim(),

            en: document
              .getElementById(
                "announcementEn"
              )
              .value
              .trim()
          },

          updatedAt:
            serverTimestamp()

        },
        { merge: true }
      );

      feedback(
        "Aviso guardado."
      );

    } catch (error) {

      console.error(error);

      feedback(
        "No se pudo guardar el aviso."
      );
    }
  };

  /*
   * Clear announcement.
   */
  document.getElementById(
    "clearAnnouncementBtn"
  ).onclick = async () => {

    try {

      await setDoc(
        statusRef,
        {
          announcement: {
            es: "",
            en: ""
          },

          updatedAt:
            serverTimestamp()

        },
        { merge: true }
      );

      feedback(
        "Aviso borrado."
      );

    } catch (error) {

      console.error(error);

      feedback(
        "No se pudo borrar el aviso."
      );
    }
  };
}
