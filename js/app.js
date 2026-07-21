(() => {
  let l = localStorage.getItem("laRocaLanguage") || "en";

  const t = (key) => TRANSLATIONS[l]?.[key] || key;

  function setLinks() {
    const whatsapp = LA_ROCCA_CONFIG.whatsappUrl;
    const maps = LA_ROCCA_CONFIG.googleMapsUrl;

    const heroWhatsApp = document.getElementById("heroWhatsApp");
    const contactWhatsApp = document.getElementById("contactWhatsApp");
    const floatingWhatsApp = document.getElementById("floatingWhatsApp");
    const heroMaps = document.getElementById("heroMaps");
    const contactMaps = document.getElementById("contactMaps");

    if (heroWhatsApp) heroWhatsApp.href = whatsapp;
    if (contactWhatsApp) contactWhatsApp.href = whatsapp;
    if (floatingWhatsApp) floatingWhatsApp.href = whatsapp;

    if (heroMaps) heroMaps.href = maps;
    if (contactMaps) contactMaps.href = maps;
  }

  function render() {
    const automaticStatus = LaRoccaSchedule.automaticStatus();
    const liveState = window.LA_ROCCA_LIVE_STATE || {};

    const currentStatus = liveState.cleaning
      ? "cleaning"
      : automaticStatus.state;

    const statusCard = document.getElementById("statusCard");
    statusCard.dataset.status = currentStatus;

    document.getElementById("statusLabel").textContent =
      t(`status.${currentStatus}`);

    const currentTime = LaRoccaSchedule.parts();
    const currentMinutes =
      currentTime.hour * 60 + currentTime.minute;

    let message;

    if (currentStatus === "cleaning") {
      message =
        l === "es"
          ? "El gimnasio está siendo limpiado."
          : "The gym is currently being cleaned.";
    } else if (currentStatus === "open") {
      message =
        `${t("status.closesIn")} ` +
        LaRoccaSchedule.diff(
          LaRoccaSchedule.mins(automaticStatus.today.close),
          currentMinutes,
          l
        );
    } else {
      const nextOpening = LaRoccaSchedule.nextOpening();

      if (nextOpening?.days === 0) {
        message =
          `${t("status.opensIn")} ` +
          LaRoccaSchedule.diff(
            LaRoccaSchedule.mins(nextOpening.time),
            currentMinutes,
            l
          );
      } else if (nextOpening) {
        const day = new Intl.DateTimeFormat(
          l === "es" ? "es-DO" : "en-US",
          {
            weekday: "long",
            timeZone: LA_ROCCA_CONFIG.timezone,
          }
        ).format(
          new Date(Date.now() + nextOpening.days * 86400000)
        );

        message =
          `${t("status.nextOpen")}: ` +
          `${day}, ${LaRoccaSchedule.fmt(nextOpening.time, l)}`;
      } else {
        message = t("status.closedToday");
      }
    }

    document.getElementById("statusMessage").textContent = message;

    document.getElementById("todayHours").textContent =
      automaticStatus.today
        ? `${LaRoccaSchedule.fmt(
            automaticStatus.today.open,
            l
          )} – ${LaRoccaSchedule.fmt(
            automaticStatus.today.close,
            l
          )}`
        : t("status.closedToday");

    const lastUpdated = document.getElementById("lastUpdated");

    if (lastUpdated) {
      lastUpdated.textContent = liveState.lastUpdated
        ? new Intl.DateTimeFormat(
            l === "es" ? "es-DO" : "en-US",
            {
              hour: "numeric",
              minute: "2-digit",
            }
          ).format(liveState.lastUpdated)
        : t("status.automatic");
    }

    const announcement =
      liveState.announcement?.[l] || "";

    const banner =
      document.getElementById("announcementBanner");

    if (announcement.trim()) {
      document.getElementById(
        "announcementText"
      ).textContent = announcement;

      banner.classList.remove("d-none");
    } else {
      banner.classList.add("d-none");
    }
  }

  function translate() {
    document.documentElement.lang = l;

    document
      .querySelectorAll("[data-i18n]")
      .forEach((element) => {
        element.textContent =
          t(element.dataset.i18n);
      });

    document.getElementById(
      "languageToggle"
    ).textContent = l === "en" ? "ES" : "EN";

    render();
  }

  document.getElementById(
    "languageToggle"
  ).onclick = () => {
    l = l === "en" ? "es" : "en";

    localStorage.setItem(
      "laRocaLanguage",
      l
    );

    translate();
  };

  window.addEventListener(
    "la-roca-live-update",
    render
  );

  setLinks();
  translate();

  setInterval(render, 30000);
})();
