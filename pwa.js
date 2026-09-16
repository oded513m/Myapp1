let deferredInstallPrompt;
const installButton = document.querySelector("#install-app");
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function setInstallButton(text) {
  if (!installButton) return;
  installButton.textContent = text;
  installButton.setAttribute("aria-label", text);
}

if (installButton && isStandalone) {
  installButton.hidden = true;
} else if (installButton && isIos) {
  setInstallButton("Add to Home Screen");
} else if (installButton) {
  setInstallButton("Install app");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setInstallButton("Open in a browser to install");
    });
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton) installButton.hidden = false;
});

if (installButton) {
  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      if (isIos) {
        setInstallButton("Tap Share, then Add to Home Screen");
      } else {
        setInstallButton("Open browser menu, then Install app");
      }
      return;
    }

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (outcome === "accepted") installButton.hidden = true;
  });
}

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});
