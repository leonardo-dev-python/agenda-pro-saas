const siteMeta = window.AGENDA_PRO_SITE_META || {};

const textBindings = {
  supportEmail: siteMeta.supportEmail || "",
  billingEmail: siteMeta.billingEmail || siteMeta.supportEmail || "",
  privacyEmail: siteMeta.privacyEmail || siteMeta.supportEmail || "",
  supportWhatsAppLabel: siteMeta.supportWhatsAppLabel || "",
  legalNotice: siteMeta.legalNotice || "",
  brandName: siteMeta.brandName || "Agenda Pro",
};

Object.entries(textBindings).forEach(([key, value]) => {
  document.querySelectorAll(`[data-site-text="${key}"]`).forEach((node) => {
    node.textContent = value;
  });
});

document.querySelectorAll("[data-site-email]").forEach((node) => {
  const emailKey = node.getAttribute("data-site-email");
  const email = textBindings[emailKey] || "";
  if (!email) return;

  if (node.tagName === "A") {
    node.textContent = email;
    node.setAttribute("href", `mailto:${email}`);
  } else {
    node.textContent = email;
  }
});
