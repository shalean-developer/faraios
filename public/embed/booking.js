(function () {
  var script = document.currentScript;
  if (!script) {
    var embedScripts = document.querySelectorAll('script[src*="embed/booking.js"]');
    script = embedScripts.length ? embedScripts[embedScripts.length - 1] : null;
  }
  if (!script) {
    console.error("[FaraiOS] booking.js could not find its script tag.");
    return;
  }

  var businessId = script.getAttribute("data-business-id");
  if (!businessId) {
    console.error("[FaraiOS] data-business-id is required.");
    return;
  }

  var containerId = script.getAttribute("data-container-id") || "faraios-booking";
  var container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    script.parentNode.insertBefore(container, script.nextSibling);
  }

  var baseUrl = script.getAttribute("data-api-base") || "";
  if (!baseUrl) {
    var src = script.src || "";
    baseUrl = src.replace(/\/embed\/booking\.js.*$/, "");
  }

  function parseUtm() {
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

  function trackEvent(eventType) {
    var utm = parseUtm();
    try {
      fetch(baseUrl + "/api/public/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: businessId,
          eventType: eventType,
          sourceUrl: window.location.href,
          referrer: document.referrer || null,
          utmSource: utm.utmSource,
          utmMedium: utm.utmMedium,
          utmCampaign: utm.utmCampaign,
        }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        if (key === "className") node.className = props[key];
        else if (key === "text") node.textContent = props[key];
        else node.setAttribute(key, props[key]);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function fieldInput(field) {
    if (field.type === "textarea" || field.type === "address") {
      return el("textarea", { name: field.key, rows: "3", className: "faraios-input" });
    }
    if (field.type === "consent") {
      var checkbox = el("input", { type: "checkbox", name: field.key });
      return el("label", { className: "faraios-consent" }, [
        checkbox,
        el("span", { text: " " + field.label }),
      ]);
    }
    if (field.type === "dropdown" || field.type === "radio") {
      var select = el("select", { name: field.key, className: "faraios-input" });
      (field.options || []).forEach(function (opt) {
        select.appendChild(el("option", { value: opt, text: opt }));
      });
      return select;
    }
    var type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text";
    return el("input", { type: type, name: field.key, className: "faraios-input" });
  }

  function renderForm(form, services) {
    container.innerHTML = "";
    var style = el("style", {
      text:
        ".faraios-booking{font-family:system-ui,sans-serif;max-width:100%;width:100%;margin:0}" +
        ".faraios-field{margin-bottom:12px}" +
        ".faraios-label{display:block;font-size:14px;font-weight:600;margin-bottom:4px}" +
        ".faraios-input{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:14px}" +
        ".faraios-btn{margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;background:#7c3aed;color:#fff;font-weight:600;cursor:pointer}" +
        ".faraios-msg{margin-top:10px;font-size:14px}",
    });
    container.appendChild(style);

    var root = el("div", { className: "faraios-booking" });
    var title = el("h3", { text: form.name || "Book a service", className: "faraios-title" });
    root.appendChild(title);

    var formEl = el("form");
    var serviceOptions = services || [];

    form.fields.forEach(function (field) {
      if (field.type === "hidden") return;
      var wrap = el("div", { className: "faraios-field" });
      if (field.type !== "consent") {
        wrap.appendChild(
          el("label", {
            className: "faraios-label",
            text: field.label + (field.required ? " *" : ""),
          })
        );
      }
      if (field.key === "service_id") {
        if (serviceOptions.length) {
          var serviceSelect = el("select", {
            name: "service_id",
            className: "faraios-input",
            required: field.required ? "required" : null,
          });
          serviceSelect.appendChild(el("option", { value: "", text: "Select a service" }));
          serviceOptions.forEach(function (svc) {
            serviceSelect.appendChild(
              el("option", { value: svc.id, text: svc.name })
            );
          });
          wrap.appendChild(serviceSelect);
        } else {
          wrap.appendChild(
            el("p", {
              className: "faraios-msg",
              text: "No services are available to book online yet. Please contact the business directly.",
            })
          );
        }
      } else {
        var input = fieldInput(field);
        if (field.required && field.type !== "consent") input.required = true;
        wrap.appendChild(input);
      }
      formEl.appendChild(wrap);
    });

    var message = el("div", { className: "faraios-msg" });
    var submit = el("button", {
      type: "submit",
      className: "faraios-btn",
      text: "Submit booking request",
    });

    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      message.textContent = "Submitting...";
      submit.disabled = true;

      var fd = new FormData(formEl);
      var customResponses = {};
      var utm = parseUtm();
      var payload = {
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        serviceId: "",
        bookingDate: "",
        preferredTime: "",
        address: "",
        notes: "",
        consentGiven: false,
        sourceWebsite: window.location.href,
        referrer: document.referrer || null,
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
        landingPage: window.location.href,
        conversionPage: window.location.href,
        customResponses: customResponses,
      };

      form.fields.forEach(function (field) {
        var value = fd.get(field.key);
        if (field.type === "consent") {
          payload.consentGiven = Boolean(value);
          return;
        }
        if (value == null || value === "") return;
        if (field.system) {
          if (field.key === "customer_name") payload.customerName = String(value);
          else if (field.key === "customer_email") payload.customerEmail = String(value);
          else if (field.key === "customer_phone") payload.customerPhone = String(value);
          else if (field.key === "service_id") payload.serviceId = String(value);
          else if (field.key === "booking_date") payload.bookingDate = String(value);
          else if (field.key === "preferred_time") payload.preferredTime = String(value);
          else if (field.key === "address") payload.address = String(value);
          else if (field.key === "notes") payload.notes = String(value);
        } else {
          customResponses[field.key] = value;
        }
      });

      fetch(baseUrl + "/api/public/business/" + encodeURIComponent(businessId) + "/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok || !result.data.ok) {
            throw new Error((result.data && result.data.error) || "Booking failed.");
          }
          message.style.color = "#059669";
          message.textContent = "Booking request received. We'll be in touch soon.";
          trackEvent("booking_submission");
          formEl.reset();
        })
        .catch(function (err) {
          message.style.color = "#dc2626";
          message.textContent = err.message || "Something went wrong.";
        })
        .finally(function () {
          submit.disabled = false;
        });
    });

    formEl.appendChild(submit);
    formEl.appendChild(message);
    root.appendChild(formEl);
    container.appendChild(root);
  }

  Promise.all([
    fetch(baseUrl + "/api/public/business/" + encodeURIComponent(businessId) + "/booking-form").then(function (r) {
      return r.json();
    }),
    fetch(baseUrl + "/api/public/business/" + encodeURIComponent(businessId) + "/services").then(function (r) {
      return r.json();
    }),
  ])
    .then(function (results) {
      var formResult = results[0];
      var servicesResult = results[1];
      if (!formResult.ok) throw new Error(formResult.error || "Form not available.");
      var services = servicesResult && servicesResult.ok ? servicesResult.services || [] : [];
      if (servicesResult && !servicesResult.ok) {
        console.warn("[FaraiOS] Services could not be loaded:", servicesResult.error);
      }
      renderForm(formResult.form, services);
      trackEvent("booking_form_view");
    })
    .catch(function (err) {
      container.innerHTML =
        '<p style="color:#dc2626;font-family:system-ui,sans-serif">FaraiOS booking widget: ' +
        (err.message || "Failed to load") +
        "</p>";
    });
})();
