(function () {
  "use strict";

  const links = [
    "aHR0cDovLzQzLjE0Mi4xMzUuNzc=",
    "aHR0cHM6Ly8zOC41OS4yNDUuMTA=",
    "aHR0cHM6Ly9wYWdlcy5tZ25iMDEuY29t",
    "aHR0cHM6Ly9wYWdlcy5tZ25iMDIuY29t"
  ];

  const tableBody = document.getElementById("link-table-body");
  const symbolArt = document.querySelector(".symbol-art");
  const states = [];
  let checksStarted = false;

  function decodeUrl(encodedUrl) {
    return window.atob(encodedUrl);
  }

  function buildTargetUrl(encodedUrl) {
    const hash = window.location.hash || "";
    return decodeUrl(encodedUrl) + "/" + hash;
  }

  function getLatencyClass(latency) {
    if (latency === null || latency >= 1000) return "latency-slow";
    if (latency >= 500) return "latency-medium";
    return "latency-fast";
  }

  function updateRecommended() {
    let bestIndex = -1;
    let bestLatency = Number.POSITIVE_INFINITY;

    states.forEach(function (state, index) {
      if (!state || state.available !== true) return;
      if (state.latency < bestLatency) {
        bestLatency = state.latency;
        bestIndex = index;
      }
    });

    states.forEach(function (state, index) {
      if (!state) return;
      if (index === bestIndex && state.available === true) {
        state.recommend.classList.remove("hidden");
      } else {
        state.recommend.classList.add("hidden");
      }
    });
  }

  function createStatusElement() {
    const status = document.createElement("span");
    status.className = "latency-pending";
    status.textContent = " Checking...";
    return status;
  }

  function fitSymbolArt() {
    const maxFontSize = 13;
    const minFontSize = 6;
    let fontSize = maxFontSize;

    if (!symbolArt) {
      return;
    }

    symbolArt.style.fontSize = maxFontSize + "px";

    while (symbolArt.scrollWidth > symbolArt.clientWidth && fontSize > minFontSize) {
      fontSize -= 0.5;
      symbolArt.style.fontSize = fontSize + "px";
    }
  }

  function renderRow(encodedUrl, index) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const linkCell = document.createElement("td");
    const anchor = document.createElement("a");
    const status = createStatusElement();
    const recommend = document.createElement("span");

    nameCell.textContent = "Line " + (index + 1);

    anchor.href = buildTargetUrl(encodedUrl);
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = "Go to this Link";

    recommend.className = "recommend-badge hidden";
    recommend.textContent = "Recommended";

    linkCell.appendChild(anchor);
    linkCell.appendChild(status);
    linkCell.appendChild(recommend);
    row.appendChild(nameCell);
    row.appendChild(linkCell);
    tableBody.appendChild(row);

    states[index] = {
      available: undefined,
      latency: Infinity,
      status: status,
      recommend: recommend
    };

    if (index === 0) {
      status.className = "latency-fast";
      status.textContent = " China Mainland";
    }
  }

  function measureLatency(encodedUrl, index) {
    const start = performance.now();
    const timeoutMs = 5000;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(function () {
      controller.abort();
      finalize(null);
    }, timeoutMs);
    const probeUrl =
      decodeUrl(encodedUrl) +
      "/favicon.ico?probe=" +
      Date.now() +
      Math.random().toString(16).slice(2);

    let settled = false;

    function finalize(latency) {
      const state = states[index];
      if (!state || settled) return;
      settled = true;
      window.clearTimeout(timeoutId);

      if (latency === null) {
        state.available = false;
        state.latency = Infinity;
        state.status.className = "latency-slow";
        state.status.textContent = " Unavailable";
        updateRecommended();
        return;
      }

      state.available = true;
      state.latency = latency;
      state.status.className = getLatencyClass(latency);
      state.status.textContent = " " + latency + " ms";
      updateRecommended();
    }

    fetch(probeUrl, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal
    })
      .then(function () {
        finalize(Math.round(performance.now() - start));
      })
      .catch(function () {
        finalize(null);
      });
  }

  function startLatencyChecks() {
    if (checksStarted) {
      return;
    }

    checksStarted = true;
    links.forEach(function (encodedUrl, index) {
      if (index === 0) return;
      measureLatency(encodedUrl, index);
    });
  }

  links.forEach(renderRow);
  fitSymbolArt();

  window.addEventListener("resize", fitSymbolArt);

  if (document.readyState === "complete") {
    window.setTimeout(function () {
      fitSymbolArt();
      startLatencyChecks();
    }, 60);
  } else {
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        fitSymbolArt();
        startLatencyChecks();
      }, 60);
    }, { once: true });
  }
})();
