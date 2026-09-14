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


const config = LA_ROCA_CONFIG;

const setupWarning =
  document.getElementById("setupWarning");

const firebaseReady =
  config.firebaseConfig?.apiKey &&
  !config.firebaseConfig.apiKey.includes("PASTE");


if (!firebaseReady) {
  setupWarning.textContent =
    "Completa firebaseConfig en js/config.js.";

  setupWarning.classList.remove("d-none");

  document.getElementById(
    "signInBtn"
  ).disabled = true;

  return;
}


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
  temporaryClosedStartedAt: null
};


/* -----------------------------
   Helpers
----------------------------- */

const feedback = (message) => {
  const element =
    document.getElementById("feedback");

  if (element) {
    element.textContent = message;
  }
};


const getActiveStatus = () => {
  const status =
    live.manualStatus || "automatic";


  /* Cerrado expires at midnight
     Dominican Republic time */

  if (status === "closed") {
    if (
      live.closedUntil &&
      Date.now() < live.closedUntil.getTime()
    ) {
      return "closed";
    }

    return "automatic";
  }


  /* Temporary closure expires
     after two hours */

  if (status === "temporaryClosed") {
    if (
      live.temporaryClosedStartedAt &&
      Date.now() -
        live.temporaryClosedStartedAt.getTime()
        < 2 * 60 * 60 * 1000
    ) {
      return "temporaryClosed";
    }

    return "automatic";
  }


  return status;
};


const updateButtons = () => {
  const activeStatus =
    getActiveStatus();


  const buttons = {
    automatic: document.getElementById(
      "automaticBtn"
    ),

    cleaning: document.getElementById(
      "cleaningBtn"
    ),

    closed: document.getElementById(
      "closedBtn"
    ),

    temporaryClosed:
      document.getElementById(
        "temporaryClosedBtn"
      )
  };


  Object.entries(buttons).forEach(
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
      automatic: "AUTOMÁTICO",
      cleaning: "🧹 EN LIMPIEZA",
      closed: "CERRADO",
      temporaryClosed:
        "⏳ TEMPORALMENTE CERRADO"
    };

    adminStatus.textContent =
      labels[activeStatus];
  }
};


/* -----------------------------
   Authentication
----------------------------- */

document.getElementById(
  "signInBtn"
).onclick = () => {
  signInWithPopup(
    auth,
    provider
  ).catch((error) => {
    feedback(error.message);
  });
};


document.getElementById(
  "signOutBtn"
).onclick = () => {
  signOut(auth);
};


onAuthStateChanged(
  auth,
  (user) => {

    document
      .getElementById("signedOutView")
      .classList.toggle(
        "d-none",
        !!user
      );


    document
      .getElementById("signOutBtn")
      .classList.toggle(
        "d-none",
        !user
      );


    document
      .getElementById("unauthorizedView")
      .classList.add("d-none");


    document
      .getElementById("dashboard")
      .classList.add("d-none");


    if (!user) return;


    const authorized =
      config.adminEmails
        .map(email =>
          email.toLowerCase()
        )
        .includes(
          (user.email || "").toLowerCase()
        );


    if (authorized) {
      document
        .getElementById("dashboard")
        .classList.remove("d-none");
    } else {
      document
        .getElementById("unauthorizedView")
        .classList.remove("d-none");
    }
  }
);


/* -----------------------------
   Live Firestore status
----------------------------- */

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
          data.temporaryClosedStartedAt
            ?.toDate?.() || null,

        announcement:
          data.announcement || {
            es: "",
            en: ""
          }
      };

    } else {
      live = {
        manualStatus: "automatic",
        closedUntil: null,
        temporaryClosedStartedAt: null,
        announcement: {
          es: "",
          en: ""
        }
      };
    }


    updateButtons();


    /* Announcement fields */

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
      "La Roca admin Firebase error:",
      error
    );

    feedback(
      "Error conectando con Firebase."
    );
  }
);


/* -----------------------------
   Status buttons
----------------------------- */

const setStatus = async (
  status
) => {

  try {

    const data = {
      manualStatus: status,
      updatedAt: serverTimestamp()
    };


    if (status === "closed") {

      /*
        Calculate midnight in
        Dominican Republic time.

        The public site receives
        this exact timestamp and
        automatically switches back
        to the weekly schedule then.
      */

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
        (name) =>
          parts.find(
            part =>
              part.type === name
          )?.value;


      const year =
        Number(getPart("year"));

      const month =
        Number(getPart("month"));

      const day =
        Number(getPart("day"));


      /*
        Dominican Republic is UTC-4
        year-round, so midnight DR
        = 04:00 UTC.
      */

      const midnightDR =
        new Date(
          Date.UTC(
            year,
            month - 1,
            day + 1,
            4,
            0,
            0
          )
        );


      data.closedUntil =
        midnightDR;
    }


    if (
      status === "temporaryClosed"
    ) {
      data.temporaryClosedStartedAt =
        new Date();
    }


    if (status === "automatic") {
      data.closedUntil = null;
      data.temporaryClosedStartedAt =
        null;
    }


    if (status === "cleaning") {
      data.closedUntil = null;
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

    console.error(error);

    feedback(
      "No se pudo actualizar el estado."
    );
  }
};


document.getElementById(
  "automaticBtn"
).onclick = () =>
  setStatus("automatic");


document.getElementById(
  "cleaningBtn"
).onclick = () =>
  setStatus("cleaning");


document.getElementById(
  "closedBtn"
).onclick = () =>
  setStatus("closed");


document.getElementById(
  "temporaryClosedBtn"
).onclick = () =>
  setStatus("temporaryClosed");


/* -----------------------------
   Announcement
----------------------------- */

document.getElementById(
  "saveAnnouncementBtn"
).onclick = async () => {

  await setDoc(
    statusRef,
    {
      announcement: {
        es:
          document.getElementById(
            "announcementEs"
          ).value.trim(),

        en:
          document.getElementById(
            "announcementEn"
          ).value.trim()
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


document.getElementById(
  "clearAnnouncementBtn"
).onclick = async () => {

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


/* -----------------------------
   Keep expiration status fresh
----------------------------- */

setInterval(
  updateButtons,
  30000
);
