(() => {
  let language =
    localStorage.getItem("laRocaLanguage") || "es";

  const t = (key) =>
    TRANSLATIONS[language]?.[key] || key;


  function setLinks() {
    const whatsapp =
      LA_ROCCA_CONFIG.whatsappUrl;

    const maps =
      LA_ROCCA_CONFIG.googleMapsUrl;

    const contactWhatsApp =
      document.getElementById(
        "contactWhatsApp"
      );

    const contactMaps =
      document.getElementById(
        "contactMaps"
      );

    if (contactWhatsApp) {
      contactWhatsApp.href =
        whatsapp;
    }

    if (contactMaps) {
      contactMaps.href =
        maps;
    }
  }


  function getCurrentStatus() {
    const automatic =
      LaRoccaSchedule.automaticStatus();

    const live =
      window.LA_ROCCA_LIVE_STATE || {};

    const manual =
      live.manualStatus || "automatic";


    /*
     * Manual cleaning
     */
    if (manual === "cleaning") {
      return {
        state: "cleaning",
        automatic
      };
    }


    /*
     * Manual closed
     *
     * This expires at midnight.
     */
    if (manual === "closed") {
      const closedUntil =
        live.closedUntil;

      if (
        closedUntil &&
        Date.now() < closedUntil.getTime()
      ) {
        return {
          state: "closed",
          automatic
        };
      }

      return {
        state: automatic.state,
        automatic
      };
    }


    /*
     * Temporary closure
     *
     * This expires after 2 hours.
     */
    if (manual === "temporaryClosed") {
      const startedAt =
        live.temporaryClosedStartedAt;

      if (
        startedAt &&
        Date.now() -
          startedAt.getTime() <
          2 * 60 * 60 * 1000
      ) {
        return {
          state: "temporaryClosed",
          automatic
        };
      }

      return {
        state: automatic.state,
        automatic
      };
    }


    /*
     * Normal automatic schedule.
     */
    return {
      state: automatic.state,
      automatic
    };
  }


  function render() {
    const status =
      getCurrentStatus();

    const currentStatus =
      status.state;

    const automatic =
      status.automatic;


    /*
     * Status card
     */
    const statusCard =
      document.getElementById(
        "statusCard"
      );

    if (statusCard) {
      statusCard.dataset.status =
        currentStatus;
    }


    const statusLabel =
      document.getElementById(
        "statusLabel"
      );

    if (statusLabel) {
      statusLabel.textContent =
        t(
          `status.${currentStatus}`
        );
    }


    /*
     * Status message
     */
    const currentTime =
      LaRoccaSchedule.parts();

    const currentMinutes =
      currentTime.hour * 60 +
      currentTime.minute;

    let message = "";


    if (
      currentStatus === "cleaning"
    ) {
      message =
        language === "es"
          ? "El gimnasio está siendo limpiado."
          : "The gym is currently being cleaned.";
    }


    else if (
      currentStatus === "closed"
    ) {
      message =
        language === "es"
          ? "El gimnasio está cerrado."
          : "The gym is currently closed.";
    }


    else if (
      currentStatus ===
      "temporaryClosed"
    ) {
      message =
        language === "es"
          ? "El gimnasio está temporalmente cerrado."
          : "The gym is temporarily closed.";
    }


    else if (
      currentStatus === "open"
    ) {
      message =
        `${t("status.closesIn")} ` +
        LaRoccaSchedule.diff(
          LaRoccaSchedule.mins(
            automatic.today.close
          ),
          currentMinutes,
          language
        );
    }


    else {
      const nextOpening =
        LaRoccaSchedule.nextOpening();

      if (
        nextOpening?.days === 0
      ) {
        message =
          `${t("status.opensIn")} ` +
          LaRoccaSchedule.diff(
            LaRoccaSchedule.mins(
              nextOpening.time
            ),
            currentMinutes,
            language
          );
      }

      else if (nextOpening) {
        const day =
          new Intl.DateTimeFormat(
            language === "es"
              ? "es-DO"
              : "en-US",
            {
              weekday: "long",
              timeZone:
                LA_ROCA_CONFIG.timezone
            }
          ).format(
            new Date(
              Date.now() +
              nextOpening.days *
              86400000
            )
          );

        message =
          `${t("status.nextOpen")}: ` +
          `${day}, ${LaRoccaSchedule.fmt(
            nextOpening.time,
            language
          )}`;
      }

      else {
        message =
          t("status.closedToday");
      }
    }


    const statusMessage =
      document.getElementById(
        "statusMessage"
      );

    if (statusMessage) {
      statusMessage.textContent =
        message;
    }


    /*
     * Today's hours
     */
    const todayHours =
      document.getElementById(
        "todayHours"
      );

    if (todayHours) {
      todayHours.textContent =
        automatic.today
          ? `${LaRoccaSchedule.fmt(
              automatic.today.open,
              language
            )} – ${LaRoccaSchedule.fmt(
              automatic.today.close,
              language
            )}`
          : t(
              "status.closedToday"
            );
    }


    /*
     * Announcement
     */
    const announcement =
      window.LA_ROCCA_LIVE_STATE
        ?.announcement?.[language] || "";

    const banner =
      document.getElementById(
        "announcementBanner"
      );

    const announcementText =
      document.getElementById(
        "announcementText"
      );

    if (
      banner &&
      announcementText
    ) {
      if (announcement.trim()) {
        announcementText.textContent =
          announcement;

        banner.classList.remove(
          "d-none"
        );
      } else {
        banner.classList.add(
          "d-none"
        );
      }
    }
  }


  function translate() {
    document.documentElement.lang =
      language;


    document
      .querySelectorAll(
        "[data-i18n]"
      )
      .forEach((element) => {
        element.textContent =
          t(
            element.dataset.i18n
          );
      });


    const languageToggle =
      document.getElementById(
        "languageToggle"
      );

    if (languageToggle) {
      languageToggle.textContent =
        language === "en"
          ? "ES"
          : "EN";
    }


    render();
  }


  /*
   * Language switcher
   */
  const languageToggle =
    document.getElementById(
      "languageToggle"
    );

  if (languageToggle) {
    languageToggle.onclick = () => {
      language =
        language === "en"
          ? "es"
          : "en";

      localStorage.setItem(
        "laRocaLanguage",
        language
      );

      translate();
    };
  }


  /*
   * Firebase live updates
   */
  window.addEventListener(
    "la-roca-live-update",
    render
  );


  /*
   * Initial setup
   */
  setLinks();
  translate();


  /*
   * Re-check status every 30 seconds.
   * This is important because temporary
   * closures and daily closures can expire
   * without a new Firebase update.
   */
  setInterval(
    render,
    30000
  );
})();
