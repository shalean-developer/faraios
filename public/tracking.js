(function () {
  var script = document.currentScript;
  if (!script) return;

  var businessId = script.getAttribute("data-business-id");
  if (!businessId) {
    console.error("[FaraiOS] data-business-id is required on tracking script.");
    return;
  }

  var baseUrl = script.getAttribute("data-api-base") || "";
  if (!baseUrl) {
    var src = script.src || "";
    baseUrl = src.replace(/\/tracking\.js.*$/, "");
  }

  function getUtm() {
    try {
      var params = new URLSearchParams(window.location.search);
      return {
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
      };
    } catch (e) {
      return { utmSource: null, utmMedium: null, utmCampaign: null };
    }
  }

  function track(eventType, metadata) {
    var utm = getUtm();
    var payload = {
      businessId: businessId,
      eventType: eventType,
      sourceUrl: window.location.href,
      referrer: document.referrer || null,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      metadata: metadata || {},
    };

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon(baseUrl + "/api/public/tracking", blob);
        return;
      }
    } catch (e) {}

    fetch(baseUrl + "/api/public/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {});
  }

  track("page_visit");

  function reportWebVital(name, value) {
    if (!Number.isFinite(value)) return;
    track("web_vital", { name: name, value: value, path: window.location.pathname });
  }

  if (typeof PerformanceObserver !== "undefined") {
    try {
      var lcpObserver = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        if (last) reportWebVital("LCP", last.startTime);
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch (e) {}

    try {
      var clsValue = 0;
      var clsObserver = new PerformanceObserver(function (list) {
        for (var i = 0; i < list.getEntries().length; i++) {
          var entry = list.getEntries()[i];
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      window.addEventListener("pagehide", function () {
        reportWebVital("CLS", clsValue);
      }, { once: true });
    } catch (e) {}
  }

  window.FaraiOS = window.FaraiOS || {};
  window.FaraiOS.track = track;
  window.FaraiOS.businessId = businessId;

  document.addEventListener(
    "click",
    function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var clickable = target.closest(
        "a[href], button, [role='button'], input[type='submit'], input[type='button']"
      );
      if (!clickable || clickable.closest("[data-no-track]")) return;
      var tag = clickable.tagName.toLowerCase();
      if (tag === "input") {
        var inputType = clickable.type;
        if (inputType !== "submit" && inputType !== "button") return;
      }
      var href = tag === "a" ? clickable.getAttribute("href") : null;
      var label =
        clickable.getAttribute("data-track-label") ||
        clickable.getAttribute("aria-label") ||
        (clickable.textContent || "").trim().replace(/\s+/g, " ") ||
        (tag === "input" ? clickable.value : "") ||
        tag;
      track("click", {
        label: label.slice(0, 80) || "Click",
        href: href ? href.slice(0, 500) : null,
        element: tag === "a" ? "link" : "button",
        path: window.location.pathname,
      });
    },
    true
  );

  // Legacy embed alias for sites installed before the FaraiOS rebrand
  window.Shalean = window.Shalean || window.FaraiOS;
})();
