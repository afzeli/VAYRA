/* =========================================================
   VAYRA - ADVANCED GRAPH ENGINE
   Requires: Plotly.js, Math.js
   ========================================================= */

(() => {
  "use strict";

  /* ========================= DOM ELEMENTS ========================= */
  const graphContainer = document.getElementById("graph");
  const functionList = document.getElementById("functionList");
  const pointInfo = document.getElementById("pointInfo");
  const functionInput = document.getElementById("functionInput");
  const minXInput = document.getElementById("minX");
  const maxXInput = document.getElementById("maxX");
  const samplesInput = document.getElementById("samples");
  const plotBtn = document.getElementById("plotBtn");
  const plotLinearBtn = document.getElementById("plotLinearBtn");
  const linearEquationInput = document.getElementById("linearEquationInput");
  const linearAInput = document.getElementById("linearA");
  const linearBInput = document.getElementById("linearB");
  const linearPreview = document.getElementById("linearPreview");
  const examplesBtn = document.getElementById("examplesBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resetZoomBtn = document.getElementById("resetZoomBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const menuButton = document.getElementById("menuButton");
  const sidebar = document.getElementById("sidebar");

  /* ========================= GLOBAL DATA ========================= */
  let graphs = [];

  /* ========================= SETTINGS ========================= */
  const GRAPH_CONFIG = {
    minX: -10,
    maxX: 10,
    samples: 4000,
    maxSamples: 20000,
    maxY: 1e10,
    storageKey: "vayra_graphs_v3",
  };

  /* ========================= COLORS ========================= */
  const graphColors = [
    "#d4af37",
    "#4ea1ff",
    "#48c987",
    "#ff6b81",
    "#b889ff",
    "#ff9f43",
    "#00d2d3",
    "#10ac84",
  ];

  /* ========================= HELPERS ========================= */

  function getMath() {
    if (typeof window.math === "undefined") {
      throw new Error("کتابخانه Math.js بارگذاری نشده است.");
    }

    return window.math;
  }

  function getPlotly() {
    if (typeof window.Plotly === "undefined") {
      throw new Error("کتابخانه Plotly.js بارگذاری نشده است.");
    }

    return window.Plotly;
  }

  /* ========================= GET GRAPH RANGE ========================= */

  function getGraphSettings() {
    const minX = Number(minXInput?.value ?? GRAPH_CONFIG.minX);

    const maxX = Number(maxXInput?.value ?? GRAPH_CONFIG.maxX);

    const samples = Number(samplesInput?.value ?? GRAPH_CONFIG.samples);

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      throw new Error("محدوده X معتبر نیست.");
    }

    if (minX >= maxX) {
      throw new Error("حداقل X باید از حداکثر X کوچکتر باشد.");
    }

    if (
      !Number.isFinite(samples) ||
      samples < 100 ||
      samples > GRAPH_CONFIG.maxSamples
    ) {
      throw new Error("دقت رسم باید بین 100 تا 20000 باشد.");
    }

    return {
      minX,
      maxX,
      samples: Math.floor(samples),
    };
  }

  /* ========================= PREPARE EXPRESSION ========================= */

  function prepareExpression(expression) {
    let expr = String(expression ?? "").trim();

    if (!expr) {
      throw new Error("لطفاً یک تابع وارد کنید.");
    }

    // Remove optional y =
    expr = expr.replace(/^\s*y\s*=\s*/i, "");

    // Remove spaces
    expr = expr.replace(/\s+/g, "");

    // Convert pi symbol
    expr = expr.replace(/π/gi, "pi");

    // Convert unicode minus
    expr = expr.replace(/−/g, "-");

    // Math.js supports ^ directly
    return expr;
  }

  /* ========================= CREATE MATH.JS FUNCTION ========================= */

  function createFunction(expression) {
    const math = getMath();

    const prepared = prepareExpression(expression);

    try {
      const compiled = math.compile(prepared);

      // Validate expression
      const test = compiled.evaluate({
        x: 1,
      });

      if (typeof test !== "number" && !math.isNumeric(test)) {
        throw new Error("Function must return a number.");
      }

      return function (x) {
        try {
          const result = compiled.evaluate({
            x,
          });

          const numericResult = Number(result);

          if (!Number.isFinite(numericResult)) {
            return NaN;
          }

          return numericResult;
        } catch {
          return NaN;
        }
      };
    } catch (error) {
      console.error("Function error:", error);

      throw new Error("فرمول وارد شده معتبر نیست.");
    }
  }

  /* ========================= GENERATE X VALUES ========================= */

  function generateXValues(minX, maxX, samples) {
    const values = [];

    const safeSamples = Math.max(
      100,
      Math.min(Math.floor(Number(samples)), GRAPH_CONFIG.maxSamples),
    );

    const step = (maxX - minX) / (safeSamples - 1);

    for (let i = 0; i < safeSamples; i++) {
      values.push(minX + i * step);
    }

    return values;
  }

  /* ========================= GENERATE FUNCTION POINTS ========================= */

  function generatePoints(func, minX, maxX, samples) {
    const xValues = generateXValues(minX, maxX, samples);

    const yValues = [];

    let previousY = null;

    for (let i = 0; i < xValues.length; i++) {
      const x = xValues[i];

      let y;

      try {
        y = Number(func(x));
      } catch {
        y = NaN;
      }

      // Invalid values
      if (!Number.isFinite(y) || Math.abs(y) > GRAPH_CONFIG.maxY) {
        yValues.push(null);

        previousY = null;

        continue;
      }

      // Detect vertical jumps
      if (previousY !== null) {
        const jump = Math.abs(y - previousY);

        if (jump > 100000) {
          yValues.push(null);

          previousY = y;

          continue;
        }
      }

      yValues.push(y);

      previousY = y;
    }

    return {
      x: xValues,
      y: yValues,
    };
  }

  /* ========================= CREATE FUNCTION TRACE ========================= */

  function createFunctionTrace(expression, options = {}) {
    const minX = Number.isFinite(Number(options.minX))
      ? Number(options.minX)
      : GRAPH_CONFIG.minX;

    const maxX = Number.isFinite(Number(options.maxX))
      ? Number(options.maxX)
      : GRAPH_CONFIG.maxX;

    const samples = Number.isFinite(Number(options.samples))
      ? Number(options.samples)
      : GRAPH_CONFIG.samples;

    const func = createFunction(expression);

    const points = generatePoints(func, minX, maxX, samples);

    const color = graphColors[graphs.length % graphColors.length];

    return {
      x: points.x,
      y: points.y,

      type: "scattergl",

      mode: "lines",

      name: options.name || expression,

      graphType: "function",

      expression: expression,

      line: {
        color,
        width: 2.5,
      },

      connectgaps: false,

      hovertemplate:
        "<b>%{fullData.name}</b>" +
        "<br>x = %{x:.6f}" +
        "<br>y = %{y:.6f}" +
        "<extra></extra>",
    };
  }

  /* ========================= NORMAL FUNCTION PLOT ========================= */

  function plotFunction(expression, options = {}) {
    try {
      if (typeof expression !== "string") {
        throw new Error("تابع وارد شده معتبر نیست.");
      }

      const cleanExpression = expression.trim();

      if (!cleanExpression) {
        throw new Error("لطفاً تابع را وارد کنید.");
      }

      const settings = getGraphSettings();

      const trace = createFunctionTrace(cleanExpression, {
        ...settings,
        ...options,
      });

      graphs.push(trace);

      updateGraph();

      updateFunctionList();

      saveGraphs();

      return true;
    } catch (error) {
      console.error(error);

      alert(error.message || "خطا در رسم نمودار.");

      return false;
    }
  }

  /* ========================= LINEAR FUNCTION ========================= */

  function normalizeLinearExpression(expression) {
    let expr = String(expression ?? "").trim();

    if (!expr) {
      throw new Error("لطفاً تابع درجه یک را وارد کنید.");
    }

    // Remove y =
    expr = expr.replace(/^\s*y\s*=\s*/i, "");

    // Remove spaces
    expr = expr.replace(/\s+/g, "");

    // Unicode minus
    expr = expr.replace(/−/g, "-");

    // Normalize X
    expr = expr.replace(/X/g, "x");

    // Check x
    if (!/[x]/.test(expr)) {
      throw new Error("تابع درجه یک باید شامل متغیر x باشد.");
    }

    return expr;
  }

  /* ========================= CREATE LINEAR TRACE ========================= */

  function createLinearTraceFromEquation(expression, options = {}) {
    const normalized = normalizeLinearExpression(expression);

    const func = createFunction(normalized);

    const minX = Number.isFinite(Number(options.minX))
      ? Number(options.minX)
      : GRAPH_CONFIG.minX;

    const maxX = Number.isFinite(Number(options.maxX))
      ? Number(options.maxX)
      : GRAPH_CONFIG.maxX;

    const samples = Number.isFinite(Number(options.samples))
      ? Number(options.samples)
      : GRAPH_CONFIG.samples;

    const points = generatePoints(func, minX, maxX, samples);

    const color = graphColors[graphs.length % graphColors.length];

    return {
      x: points.x,
      y: points.y,

      type: "scattergl",

      mode: "lines",

      name: options.name || `y = ${normalized}`,

      graphType: "linear",

      expression: `y = ${normalized}`,

      line: {
        color,
        width: 3.5,
      },

      connectgaps: true,

      hovertemplate:
        "<b>%{fullData.name}</b>" +
        "<br>x = %{x:.6f}" +
        "<br>y = %{y:.6f}" +
        "<extra></extra>",
    };
  }

  /* ========================= FORMAT LINEAR EQUATION ========================= */

  function formatLinearEquation(a, b) {
    let result = "";

    if (a === 1) {
      result = "x";
    } else if (a === -1) {
      result = "-x";
    } else {
      result = `${a}x`;
    }

    if (b > 0) {
      result += ` + ${b}`;
    } else if (b < 0) {
      result += ` - ${Math.abs(b)}`;
    }

    return `y = ${result}`;
  }

  /* ========================= PLOT LINEAR BY COEFFICIENTS ========================= */

  function plotLinearByCoefficients() {
    try {
      const a = Number(linearAInput?.value);

      const b = Number(linearBInput?.value);

      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error("مقدار a و b باید عدد معتبر باشند.");
      }

      const settings = getGraphSettings();

      const expression = `${a} * x + ${b}`;

      const trace = createLinearTraceFromEquation(expression, {
        ...settings,

        name: formatLinearEquation(a, b),
      });

      graphs.push(trace);

      updateGraph();

      updateFunctionList();

      saveGraphs();

      return true;
    } catch (error) {
      console.error(error);

      alert(error.message || "خطا در رسم تابع درجه یک.");

      return false;
    }
  }

  /* ========================= PLOT LINEAR BY DIRECT EQUATION ========================= */

  function plotLinearByEquation() {
    try {
      const expression = String(linearEquationInput?.value ?? "").trim();

      if (!expression) {
        throw new Error("لطفاً تابع درجه یک را وارد کنید.");
      }

      const settings = getGraphSettings();

      const trace = createLinearTraceFromEquation(expression, {
        ...settings,

        name: expression,
      });

      graphs.push(trace);

      updateGraph();

      updateFunctionList();

      saveGraphs();

      return true;
    } catch (error) {
      console.error(error);

      alert(error.message || "فرمول تابع درجه یک معتبر نیست.");

      return false;
    }
  }

  /* ========================= UPDATE LINEAR PREVIEW ========================= */

  function updateLinearPreview() {
    if (!linearPreview || !linearAInput || !linearBInput) {
      return;
    }

    const a = Number(linearAInput.value);

    const b = Number(linearBInput.value);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      linearPreview.textContent = "مقدار نامعتبر";

      return;
    }

    linearPreview.textContent = formatLinearEquation(a, b);
  }

  /* ========================= EXAMPLES ========================= */

  function plotExamples() {
    const examples = [
      {
        expression: "sin(x)",

        name: "sin(x)",
      },

      {
        expression: "x^2",

        name: "x²",
      },

      {
        expression: "2*x + 3",

        name: "y = 2x + 3",
      },
    ];

    const settings = getGraphSettings();

    examples.forEach((item) => {
      try {
        const trace = item.name.includes("y =")
          ? createLinearTraceFromEquation(item.expression, {
              ...settings,

              name: item.name,
            })
          : createFunctionTrace(item.expression, {
              ...settings,

              name: item.name,
            });

        graphs.push(trace);
      } catch (error) {
        console.warn("Example failed:", error);
      }
    });

    updateGraph();

    updateFunctionList();

    saveGraphs();
  }

  /* ========================= UPDATE GRAPH ========================= */

  function updateGraph() {
    if (!graphContainer || typeof window.Plotly === "undefined") {
      return;
    }

    const Plotly = window.Plotly;

    const layout = {
      autosize: true,

      paper_bgcolor: "rgba(0,0,0,0)",

      plot_bgcolor: "#071321",

      font: {
        family: "Vazirmatn, Tahoma, sans-serif",

        color: "#ffffff",
      },

      xaxis: {
        title: "X",

        showgrid: true,

        gridcolor: "rgba(255,255,255,0.08)",

        zeroline: true,

        zerolinecolor: "#d4af37",

        zerolinewidth: 1.5,

        autorange: true,

        fixedrange: false,
      },

      yaxis: {
        title: "Y",

        showgrid: true,

        gridcolor: "rgba(255,255,255,0.08)",

        zeroline: true,

        zerolinecolor: "#d4af37",

        zerolinewidth: 1.5,

        autorange: true,

        fixedrange: false,
      },

      hovermode: "closest",

      dragmode: "pan",

      showlegend: true,

      legend: {
        orientation: "h",

        y: -0.15,
      },

      margin: {
        l: 65,

        r: 20,

        t: 30,

        b: 90,
      },

      uirevision: "vayra-fixed",
    };

    const config = {
      responsive: true,

      scrollZoom: true,

      displayModeBar: false,

      displaylogo: false,

      doubleClick: "reset",

      modeBarButtonsToRemove: ["lasso2d", "select2d"],
    };

    Plotly.react(graphContainer, graphs, layout, config);
  }

  /* ========================= CLEAR ALL GRAPHS ========================= */

  function clearGraphs() {
    graphs = [];

    updateGraph();

    updateFunctionList();

    saveGraphs();
  }

  /* ========================= REMOVE GRAPH ========================= */

  function removeGraph(index) {
    if (index < 0 || index >= graphs.length) {
      return;
    }

    graphs.splice(index, 1);

    updateGraph();

    updateFunctionList();

    saveGraphs();
  }

  /* ========================= RESET ZOOM ========================= */

  function resetZoom() {
    if (!graphContainer || typeof window.Plotly === "undefined") {
      return;
    }

    window.Plotly.relayout(graphContainer, {
      "xaxis.autorange": true,

      "yaxis.autorange": true,
    });
  }

  /* ========================= ZOOM IN ========================= */

  function zoomIn() {
    if (
      !graphContainer ||
      !graphContainer.layout ||
      !graphContainer.layout.xaxis ||
      !graphContainer.layout.yaxis
    ) {
      return;
    }

    const xRange = graphContainer.layout.xaxis.range;

    const yRange = graphContainer.layout.yaxis.range;

    if (!xRange || !yRange) {
      return;
    }

    const xCenter = (xRange[0] + xRange[1]) / 2;

    const yCenter = (yRange[0] + yRange[1]) / 2;

    const xHalf = (xRange[1] - xRange[0]) * 0.4;

    const yHalf = (yRange[1] - yRange[0]) * 0.4;

    window.Plotly.relayout(graphContainer, {
      "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

      "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
    });
  }

  /* ========================= ZOOM OUT ========================= */

  function zoomOut() {
    if (
      !graphContainer ||
      !graphContainer.layout ||
      !graphContainer.layout.xaxis ||
      !graphContainer.layout.yaxis
    ) {
      return;
    }

    const xRange = graphContainer.layout.xaxis.range;

    const yRange = graphContainer.layout.yaxis.range;

    if (!xRange || !yRange) {
      return;
    }

    const xCenter = (xRange[0] + xRange[1]) / 2;

    const yCenter = (yRange[0] + yRange[1]) / 2;

    const xHalf = (xRange[1] - xRange[0]) * 0.625;

    const yHalf = (yRange[1] - yRange[0]) * 0.625;

    window.Plotly.relayout(graphContainer, {
      "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

      "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
    });
  }

  /* ========================= FUNCTION LIST ========================= */

  function updateFunctionList() {
    if (!functionList) {
      return;
    }

    functionList.innerHTML = "";

    if (graphs.length === 0) {
      const emptyRow = document.createElement("div");

      emptyRow.className = "function-row";

      emptyRow.textContent = "هنوز نموداری رسم نشده است.";

      functionList.appendChild(emptyRow);

      return;
    }

    graphs.forEach((graph, index) => {
      const row = document.createElement("div");

      row.className = "function-row";

      const span = document.createElement("span");

      span.textContent = graph.name || graph.expression || "نمودار";

      const type = document.createElement("span");

      type.className = "graph-type";

      type.textContent = graph.graphType === "linear" ? "درجه یک" : "تابع";

      const button = document.createElement("button");

      button.className = "danger-btn";

      button.textContent = "حذف";

      button.type = "button";

      button.addEventListener("click", () => {
        removeGraph(index);
      });

      row.appendChild(span);

      row.appendChild(type);

      row.appendChild(button);

      functionList.appendChild(row);
    });
  }

  /* ========================= SAVE GRAPHS ========================= */

  function saveGraphs() {
    try {
      const data = graphs.map((graph) => ({
        graphType: graph.graphType,

        expression: graph.expression,

        name: graph.name,
      }));

      window.localStorage.setItem(
        GRAPH_CONFIG.storageKey,
        JSON.stringify(data),
      );
    } catch (error) {
      console.warn("Save error:", error);
    }
  }

  /* ========================= LOAD GRAPHS ========================= */

  function loadGraphs() {
    try {
      const saved = window.localStorage.getItem(GRAPH_CONFIG.storageKey);

      if (!saved) {
        return;
      }

      const data = JSON.parse(saved);

      if (!Array.isArray(data)) {
        return;
      }

      data.forEach((item) => {
        if (!item || !item.expression) {
          return;
        }

        try {
          const settings = {
            minX: GRAPH_CONFIG.minX,

            maxX: GRAPH_CONFIG.maxX,

            samples: GRAPH_CONFIG.samples,
          };

          const trace =
            item.graphType === "linear"
              ? createLinearTraceFromEquation(item.expression, {
                  ...settings,

                  name: item.name || item.expression,
                })
              : createFunctionTrace(item.expression, {
                  ...settings,

                  name: item.name || item.expression,
                });

          graphs.push(trace);
        } catch (error) {
          console.warn("Graph load failed:", error);
        }
      });

      updateGraph();

      updateFunctionList();
    } catch (error) {
      console.warn("Load error:", error);
    }
  }

  /* ========================= HOVER INFORMATION ========================= */

  function setupHover() {
    if (!graphContainer || !pointInfo) {
      return;
    }

    graphContainer.on("plotly_hover", (data) => {
      if (!data || !data.points || !data.points.length) {
        return;
      }

      const point = data.points[0];

      const x = Number(point.x);

      const y = Number(point.y);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }

      pointInfo.innerHTML =
        `<strong>x = ${x.toFixed(8)}</strong>` +
        "&nbsp;&nbsp;" +
        `<strong>y = ${y.toFixed(8)}</strong>`;
    });

    graphContainer.on("plotly_unhover", () => {
      pointInfo.textContent =
        "برای مشاهده مختصات، نشانگر را روی نمودار حرکت دهید.";
    });
  }

  /* ========================= EVENT LISTENERS ========================= */

  function setupEvents() {
    // Normal Function
    if (plotBtn) {
      plotBtn.addEventListener("click", () => {
        const expression = functionInput?.value.trim() || "";

        if (plotFunction(expression)) {
          if (functionInput) {
            functionInput.value = "";

            functionInput.focus();
          }
        }
      });
    }

    // Normal Function Enter
    if (functionInput) {
      functionInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();

          plotBtn?.click();
        }
      });
    }

    // Linear Function
    if (plotLinearBtn) {
      plotLinearBtn.addEventListener("click", () => {
        const directEquation = linearEquationInput?.value.trim() || "";

        if (directEquation) {
          if (plotLinearByEquation() && linearEquationInput) {
            linearEquationInput.value = "";
          }
        } else {
          plotLinearByCoefficients();
        }
      });
    }

    // Direct Linear Equation Enter
    if (linearEquationInput) {
      linearEquationInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();

          plotLinearBtn?.click();
        }
      });
    }

    // Update Preview
    linearAInput?.addEventListener("input", updateLinearPreview);

    linearBInput?.addEventListener("input", updateLinearPreview);

    // Examples
    examplesBtn?.addEventListener("click", () => {
      try {
        plotExamples();
      } catch (error) {
        alert(error.message || "خطا در رسم مثال‌ها.");
      }
    });

    // Clear
    clearBtn?.addEventListener("click", () => {
      if (graphs.length === 0) {
        return;
      }

      if (confirm("آیا می‌خواهید تمام نمودارها حذف شوند؟")) {
        clearGraphs();
      }
    });

    // Zoom
    resetZoomBtn?.addEventListener("click", resetZoom);

    zoomInBtn?.addEventListener("click", zoomIn);

    zoomOutBtn?.addEventListener("click", zoomOut);

    // Mobile Menu
    if (menuButton && sidebar) {
      menuButton.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
    }

    // Close Sidebar
    if (sidebar) {
      sidebar.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          sidebar.classList.remove("open");
        });
      });
    }
  }

  /* ========================= RESIZE ========================= */

  window.addEventListener("resize", () => {
    if (graphContainer && typeof window.Plotly !== "undefined") {
      window.Plotly.Plots.resize(graphContainer);
    }
  });

  /* ========================= INITIALIZE ========================= */

  function initialize() {
    if (typeof window.Plotly === "undefined") {
      alert("کتابخانه Plotly.js بارگذاری نشده است.");

      return;
    }

    if (typeof window.math === "undefined") {
      alert("کتابخانه Math.js بارگذاری نشده است.");

      return;
    }

    if (!graphContainer) {
      console.error("VAYRA Graph Engine: عنصر #graph پیدا نشد.");

      return;
    }

    setupEvents();

    loadGraphs();

    updateLinearPreview();

    // Default Graph
    if (graphs.length === 0) {
      plotFunction("sin(x)", {
        minX: -10,

        maxX: 10,

        samples: 4000,

        name: "sin(x)",
      });
    }

    // Setup Plotly hover events
    setupHover();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true,
    });
  } else {
    initialize();
  }

  /* ========================= GLOBAL API ========================= */

  window.VayraGraph = {
    plot: plotFunction,

    plotLinear: plotLinearByEquation,

    plotLinearByCoefficients: plotLinearByCoefficients,

    clear: clearGraphs,

    remove: removeGraph,

    resetZoom: resetZoom,

    zoomIn: zoomIn,

    zoomOut: zoomOut,
  };
})();
