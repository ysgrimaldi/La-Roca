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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const config = LA_ROCCA_CONFIG;

const setupWarning =
  document.getElementById("setupWarning");

const signInBtn =
  document.getElementById("signInBtn");

const signOutBtn =
  document.getElementById("signOutBtn");

const firebaseReady =
  config.firebaseConfig?.apiKey &&
  !config.firebaseConfig.apiKey.includes("PASTE");


/* --------------------------------
   Firebase setup
-------------------------------- */

if (!firebaseReady) {

  if (setupWarning) {
    setupWarning.textContent =
      "Completa firebaseConfig en js/config.js.";

    setupWarning.classList.remove("d-none");
  }

  if (signInBtn) {
    signInBtn.disabled = true;
  }

} else {

  const app =
    initializeApp(config.firebaseConfig);

  const auth =
    getAuth(app);

  const db =
    getFirestore(app);

  const statusRef =
    doc(db, "gym", "status");

  const provider =
    new GoogleAuthProvider();


  let live = {
    manualStatus: "automatic",
    closedUntil: null,
    temporaryClosedStartedAt: null,
    announcement: {
      es: "",
      en: ""
    }
  };


  /* --------------------------------
     Helpers
  -------------------------------- */

  const feedback = (message) => {
    const element =
      document.getElementById("feedback");

    if (element) {
      element.textContent = message;
    }
  };


  /*
    Determine what status is actually
    active right now.

    Closed:
    expires at midnight Dominican
    Republic time.

    Temporary closed:
    expires after two hours.
  */

  const getActiveStatus = () => {

    const status =
      live.manualStatus || "automatic";


    if (status === "closed") {

      if (
        live.closedUntil &&
        Date.now() <
          live.closedUntil.getTime()
      ) {
        return "closed";
      }

      return "automatic";
    }


    if (
      status === "temporaryClosed"
    ) {

      if (
        live.temporaryClosedStartedAt &&
        Date.now() -
          live.temporaryClosedStartedAt.getTime()
          <
          2 * 60 * 60 * 1000
      ) {
        return "temporaryClosed";
      }

      return "automatic";
    }


    return status;
  };


  /* --------------------------------
     Update admin UI
  -------------------------------- */

  const updateButtons = () => {

    const activeStatus =
      getActiveStatus();


    const buttons = {
      automatic:
        document.getElementById(
          "automaticBtn"
        ),

      cleaning:
        document.getElementById(
          "cleaningBtn"
        ),

      closed:
        document.getElementById(
          "closedBtn"
        ),

      temporaryClosed:
        document.getElementById(
          "temporaryClosedBtn"
        )
    };


    Object.entries(buttons)
      .forEach(
        ([status, button]) => {

          if (!button) return;

          button.classList.toggle(
            "active",
            status === activeStatus
          );
        }
      );


    const adminStatus =
      document.getElementById(
        "adminStatus"
      );


    if (adminStatus) {

      const labels = {
        automatic:
          "AUTOMÁTICO",

        cleaning:
          "🧹 EN LIMPIEZA",

        closed:
          "CERRADO",

        temporaryClosed:
          "⏳ TEMPORALMENTE CERRADO"
      };


      adminStatus.textContent =
        labels[activeStatus];
    }
  };


  /* --------------------------------
     Google sign-in
  -------------------------------- */

  if (signInBtn) {

    signInBtn.onclick = () => {

      feedback("");

      signInWithPopup(
        auth,
        provider
      ).catch((error) => {

        console.error(
          "Google sign-in error:",
          error
        );

        feedback(
          error.message
        );
      });
    };
  }


  /* --------------------------------
     Sign out
  -------------------------------- */

  if (signOutBtn) {

    signOutBtn.onclick = () => {
      signOut(auth);
    };
  }


  /* --------------------------------
     Authentication state
  -------------------------------- */

  onAuthStateChanged(
    auth,
    (user) => {

      const signedOutView =
        document.getElementById(
          "signedOutView"
        );

      const unauthorizedView =
        document.getElementById(
          "unauthorizedView"
        );

      const dashboard =
        document.getElementById(
          "dashboard"
        );


      if (signedOutView) {
        signedOutView.classList.toggle(
          "d-none",
          !!user
        );
      }


      if (signOutBtn) {
        signOutBtn.classList.toggle(
          "d-none",
          !user
        );
      }


      if (unauthorizedView) {
        unauthorizedView.classList.add(
          "d-none"
        );
      }


      if (dashboard) {
        dashboard.classList.add(
          "d-none"
        );
      }


      if (!user) return;


      const authorized =
        (config.adminEmails || [])
          .map(
            email =>
              email.toLowerCase()
          )
          .includes(
            (user.email || "")
              .toLowerCase()
          );


      if (authorized) {

        if (dashboard) {
          dashboard.classList.remove(
            "d-none"
          );
        }

      } else {

        if (unauthorizedView) {
          unauthorizedView.classList.remove(
            "d-none"
          );
        }
      }
    }
  );


  /* --------------------------------
     Live Firestore listener
  -------------------------------- */

  onSnapshot(
    statusRef,

    (snapshot) => {

      if (snapshot.exists()) {

        const data =
          snapshot.data();


        live = {

          manualStatus:
            data.manualStatus ||
            "automatic",

          closedUntil:
            data.closedUntil
              ?.toDate?.() || null,

          temporaryClosedStartedAt:
            data
              .temporaryClosedStartedAt
              ?.toDate?.() || null,

          announcement:
            data.announcement || {
              es: "",
              en: ""
            }
        };

      } else {

        live = {
          manualStatus:
            "automatic",

          closedUntil:
            null,

          temporaryClosedStartedAt:
            null,

          announcement: {
            es: "",
            en: ""
          }
        };
      }


      updateButtons();


      const announcementEs =
        document.getElementById(
          "announcementEs"
        );

      const announcementEn =
        document.getElementById(
          "announcementEn"
        );


      if (announcementEs) {
        announcementEs.value =
          live.announcement?.es || "";
      }


      if (announcementEn) {
        announcementEn.value =
          live.announcement?.en || "";
      }
    },

    (error) => {

      console.error(
        "La Roca Firebase error:",
        error
      );

      feedback(
        "Error conectando con Firebase."
      );
    }
  );


  /* --------------------------------
     Calculate next midnight in
     Dominican Republic time
  -------------------------------- */

  const getNextMidnightDR = () => {

    const now =
      new Date();


    const parts =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "America/Santo_Domingo",

          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }
      ).formatToParts(now);


    const getPart =
      (type) =>
        parts.find(
          part =>
            part.type === type
        )?.value;


    const year =
      Number(getPart("year"));

    const month =
      Number(getPart("month"));

    const day =
      Number(getPart("day"));


    /*
      Dominican Republic is UTC-4
      year-round.

      Therefore:
      midnight DR = 04:00 UTC
    */

    return new Date(
      Date.UTC(
        year,
        month - 1,
        day + 1,
        4,
        0,
        0
      )
    );
  };


  /* --------------------------------
     Set status
  -------------------------------- */

  const setStatus =
    async (status) => {

      try {

        const data = {
          manualStatus:
            status,

          updatedAt:
            serverTimestamp()
        };


        if (status === "closed") {

          data.closedUntil =
            getNextMidnightDR();

          data.temporaryClosedStartedAt =
            null;
        }


        else if (
          status === "temporaryClosed"
        ) {

          data.temporaryClosedStartedAt =
            new Date();

          data.closedUntil =
            null;
        }


        else {

          data.closedUntil =
            null;

          data.temporaryClosedStartedAt =
            null;
        }


        await setDoc(
          statusRef,
          data,
          { merge: true }
        );


        feedback(
          "Estado actualizado."
        );

      } catch (error) {

        console.error(
          "Status update error:",
          error
        );

        feedback(
          "No se pudo actualizar el estado."
        );
      }
    };


  /* --------------------------------
     Status buttons
  -------------------------------- */

  const automaticBtn =
    document.getElementById(
      "automaticBtn"
    );

  const cleaningBtn =
    document.getElementById(
      "cleaningBtn"
    );

  const closedBtn =
    document.getElementById(
      "closedBtn"
    );

  const temporaryClosedBtn =
    document.getElementById(
      "temporaryClosedBtn"
    );


  if (automaticBtn) {
    automaticBtn.onclick =
      () =>
        setStatus(
          "automatic"
        );
  }


  if (cleaningBtn) {
    cleaningBtn.onclick =
      () =>
        setStatus(
          "cleaning"
        );
  }


  if (closedBtn) {
    closedBtn.onclick =
      () =>
        setStatus(
          "closed"
        );
  }


  if (temporaryClosedBtn) {
    temporaryClosedBtn.onclick =
      () =>
        setStatus(
          "temporaryClosed"
        );
  }


  /* --------------------------------
     Announcements
  -------------------------------- */

  const saveAnnouncementBtn =
    document.getElementById(
      "saveAnnouncementBtn"
    );


  if (saveAnnouncementBtn) {

    saveAnnouncementBtn.onclick =
      async () => {

        await setDoc(
          statusRef,
          {
            announcement: {
              es:
                document.getElementById(
                  "announcementEs"
                )?.value
                  .trim() || "",

              en:
                document.getElementById(
                  "announcementEn"
                )?.value
                  .trim() || ""
            },

            updatedAt:
              serverTimestamp()
          },

          { merge: true }
        );


        feedback(
          "Aviso guardado."
        );
      };
  }


  const clearAnnouncementBtn =
    document.getElementById(
      "clearAnnouncementBtn"
    );


  if (clearAnnouncementBtn) {

    clearAnnouncementBtn.onclick =
      async () => {

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
      };
  }


  /* --------------------------------
     Refresh expiration state
  -------------------------------- */

  setInterval(
    updateButtons,
    30000
  );
}
