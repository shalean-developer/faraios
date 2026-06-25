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

  window.FaraiOS = window.FaraiOS || {};
  window.FaraiOS.track = track;
  window.FaraiOS.businessId = businessId;
  // Legacy embed alias for sites installed before the FaraiOS rebrand
  window.Shalean = window.Shalean || window.FaraiOS;
})();
