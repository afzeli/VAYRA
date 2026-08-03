/* =========================================================
VAYRA - ADVANCED GRAPH ENGINE
Version: Final
Requires:

* Plotly.js
* Math.js

Features:

* sin, cos, tan
* asin, acos, atan
* sinh, cosh, tanh
* log, ln, log10, exp
* logarithm with custom base
* degree / radian mode
* deg(x) / rad(x)
* asymptote detection
* detailed formula errors
* multiple graphs
* linear functions
* localStorage
* zoom / pan
  ========================================================= */

(() => {
  "use strict";

  /* =========================================================
DOM ELEMENTS
========================================================= */

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

  /* =========================================================
GLOBAL STATE
========================================================= */

  let graphs = [];

  let angleMode = "rad";

  /* =========================================================
CONFIG
========================================================= */

  const GRAPH_CONFIG = {
    minX: -10,

    maxX: 10,

    samples: 4000,

    maxSamples: 20000,

    maxY: 1e10,

    asymptoteJumpFactor: 25,

    storageKey: "vayra_graphs_v4",

    angleModeKey: "vayra_angle_mode",
  };

  /* =========================================================
COLORS
========================================================= */

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

  /* =========================================================
LIBRARY CHECK
========================================================= */

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

  /* =========================================================
ANGLE MODE
========================================================= */

  function setAngleMode(mode) {
    if (mode !== "rad" && mode !== "deg") {
      mode = "rad";
    }

    angleMode = mode;

    try {
      localStorage.setItem(GRAPH_CONFIG.angleModeKey, angleMode);
    } catch (error) {
      console.warn("Angle mode save failed:", error);
    }
  }

  function loadAngleMode() {
    try {
      const saved = localStorage.getItem(GRAPH_CONFIG.angleModeKey);

      if (saved === "rad" || saved === "deg") {
        angleMode = saved;
      }
    } catch (error) {
      console.warn("Angle mode load failed:", error);
    }
  }

  function toRadians(value) {
    return angleMode === "deg" ? (value * Math.PI) / 180 : value;
  }

  function fromRadians(value) {
    return angleMode === "deg" ? (value * 180) / Math.PI : value;
  }

  /* =========================================================
CUSTOM MATH FUNCTIONS
========================================================= */

  function createMathScope() {
    const math = getMath();

    return {
      pi: Math.PI,

      e: Math.E,

      deg: function (x) {
        return (Number(x) * 180) / Math.PI;
      },

      rad: function (x) {
        return (Number(x) * Math.PI) / 180;
      },

      sin: function (x) {
        return Math.sin(toRadians(Number(x)));
      },

      cos: function (x) {
        return Math.cos(toRadians(Number(x)));
      },

      tan: function (x) {
        const radians = toRadians(Number(x));

        const cosValue = Math.cos(radians);

        if (Math.abs(cosValue) < 1e-12) {
          return Infinity;
        }

        return Math.tan(radians);
      },

      asin: function (x) {
        return fromRadians(Math.asin(Number(x)));
      },

      acos: function (x) {
        return fromRadians(Math.acos(Number(x)));
      },

      atan: function (x) {
        return fromRadians(Math.atan(Number(x)));
      },

      atan2: function (y, x) {
        return fromRadians(Math.atan2(Number(y), Number(x)));
      },

      sinh: function (x) {
        return Math.sinh(Number(x));
      },

      cosh: function (x) {
        return Math.cosh(Number(x));
      },

      tanh: function (x) {
        return Math.tanh(Number(x));
      },

      ln: function (x) {
        const value = Number(x);

        if (value <= 0) {
          return NaN;
        }

        return Math.log(value);
      },

      log10: function (x) {
        const value = Number(x);

        if (value <= 0) {
          return NaN;
        }

        return Math.log10(value);
      },

      log: function (x, base) {
        const value = Number(x);

        if (value <= 0) {
          return NaN;
        }

        if (typeof base === "undefined") {
          return Math.log10(value);
        }

        const b = Number(base);

        if (b <= 0 || b === 1) {
          return NaN;
        }

        return Math.log(value) / Math.log(b);
      },

      exp: function (x) {
        return Math.exp(Number(x));
      },

      sqrt: function (x) {
        return Math.sqrt(Number(x));
      },

      abs: function (x) {
        return Math.abs(Number(x));
      },
    };
  }

  /* =========================================================
PREPARE EXPRESSION
========================================================= */

  function prepareExpression(expression) {
    let expr = String(expression ?? "").trim();

    if (!expr) {
      throw new Error("لطفاً یک تابع وارد کنید.");
    }

    /* Remove y = */

    expr = expr.replace(/^\s*y\s*=\s*/i, "");

    /* Remove spaces */

    expr = expr.replace(/\s+/g, "");

    /* Persian / Unicode symbols */

    expr = expr.replace(/π/gi, "pi");

    expr = expr.replace(/−/g, "-");

    /* Normalize uppercase X */

    expr = expr.replace(/X/g, "x");

    /* Common function aliases */

    expr = expr.replace(/\bln\(/gi, "ln(");

    expr = expr.replace(/\blog10\(/gi, "log10(");

    expr = expr.replace(/\bEXP\(/g, "exp(");

    /*
  log2(x)
  log3(x)
  log10(x)

  Convert:
  log2(x) -> log(x,2)
  log3(x) -> log(x,3)

  Keep log10 as log10.
*/

    expr = expr.replace(/\blog(\d+)\(([^()]*)\)/gi, (match, base, value) => {
      if (base === "10") {
        return `log10(${value})`;
      }

      return `log(${value},${base})`;
    });

    return expr;
  }

  /* =========================================================
FORMULA ERROR ANALYSIS
========================================================= */

  function getDetailedError(expression, error) {
    const message = String(error?.message || error || "");

    if (/Undefined symbol/i.test(message)) {
      const match = message.match(/Undefined symbol\s+([^\s]+)/i);

      const symbol = match?.[1] || "";

      return (
        `تابع یا نماد «${symbol}» شناخته نشد. ` +
        `از توابعی مثل sin, cos, tan, ln, log, exp, sqrt استفاده کنید.`
      );
    }

    if (/Parenthesis/i.test(message) || /parentheses/i.test(message)) {
      return (
        "پرانتزهای فرمول صحیح نیستند. " +
        "تعداد پرانتزهای باز و بسته را بررسی کنید."
      );
    }

    if (/Unexpected end/i.test(message)) {
      return "فرمول ناقص است. " + "احتمالاً یک عملگر یا پرانتز بسته نشده است.";
    }

    if (/Unexpected token/i.test(message)) {
      return "در فرمول یک علامت یا کاراکتر غیرمنتظره وجود دارد.";
    }

    if (/Division by zero/i.test(message)) {
      return "تقسیم بر صفر در فرمول وجود دارد.";
    }

    return (
      `فرمول «${expression}» معتبر نیست. ` +
      `جزئیات: ${message || "خطای ناشناخته"}`
    );
  }

  /* =========================================================
CREATE FUNCTION
========================================================= */

  function createFunction(expression) {
    const math = getMath();

    const prepared = prepareExpression(expression);

    try {
      const scope = createMathScope();

      /*
    Use math.parse first.
    This gives better syntax validation.
  */

      const node = math.parse(prepared);

      const compiled = node.compile();

      /* Test evaluation */

      const test = compiled.evaluate({
        x: 1,
        ...scope,
      });

      if (typeof test !== "number" && !math.isNumeric(test)) {
        throw new Error("تابع باید یک مقدار عددی برگرداند.");
      }

      return function (x) {
        try {
          const result = compiled.evaluate({
            x,

            ...scope,
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
      console.error("Formula error:", error);

      throw new Error(getDetailedError(expression, error));
    }
  }

  /* =========================================================
GRAPH SETTINGS
========================================================= */

  function getGraphSettings() {
    const minX = Number(minXInput?.value ?? GRAPH_CONFIG.minX);

    const maxX = Number(maxXInput?.value ?? GRAPH_CONFIG.maxX);

    const samples = Number(samplesInput?.value ?? GRAPH_CONFIG.samples);

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      throw new Error("محدوده X معتبر نیست.");
    }

    if (minX >= maxX) {
      throw new Error("حداقل X باید از حداکثر X کوچک‌تر باشد.");
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

  /* =========================================================
GENERATE X VALUES
========================================================= */

  function generateXValues(minX, maxX, samples) {
    const safeSamples = Math.max(
      100,
      Math.min(Math.floor(Number(samples)), GRAPH_CONFIG.maxSamples),
    );

    const step = (maxX - minX) / (safeSamples - 1);

    const values = new Array(safeSamples);

    for (let i = 0; i < safeSamples; i++) {
      values[i] = minX + i * step;
    }

    return values;
  }

  /* =========================================================
ASYMPTOTE DETECTION
========================================================= */

  function isLikelyAsymptote(previousY, currentY, nextY) {
    if (!Number.isFinite(previousY) || !Number.isFinite(currentY)) {
      return true;
    }

    const absoluteCurrent = Math.abs(currentY);

    if (absoluteCurrent > GRAPH_CONFIG.maxY) {
      return true;
    }

    if (Number.isFinite(nextY)) {
      const jumpLeft = Math.abs(currentY - previousY);

      const jumpRight = Math.abs(nextY - currentY);

      const localScale = Math.max(1, Math.abs(currentY));

      if (
        jumpLeft > GRAPH_CONFIG.asymptoteJumpFactor * localScale ||
        jumpRight > GRAPH_CONFIG.asymptoteJumpFactor * localScale
      ) {
        return true;
      }
    }

    return false;
  }

  /* =========================================================
GENERATE POINTS
========================================================= */

  function generatePoints(func, minX, maxX, samples) {
    const xValues = generateXValues(minX, maxX, samples);

    const rawY = new Array(xValues.length);

    for (let i = 0; i < xValues.length; i++) {
      try {
        const y = Number(func(xValues[i]));

        rawY[i] = Number.isFinite(y) ? y : NaN;
      } catch {
        rawY[i] = NaN;
      }
    }

    const yValues = new Array(xValues.length);

    for (let i = 0; i < rawY.length; i++) {
      const current = rawY[i];

      const previous = i > 0 ? rawY[i - 1] : NaN;

      const next = i < rawY.length - 1 ? rawY[i + 1] : NaN;

      if (!Number.isFinite(current)) {
        yValues[i] = null;

        continue;
      }

      if (Math.abs(current) > GRAPH_CONFIG.maxY) {
        yValues[i] = null;

        continue;
      }

      if (isLikelyAsymptote(previous, current, next)) {
        yValues[i] = null;

        continue;
      }

      yValues[i] = current;
    }

    return {
      x: xValues,

      y: yValues,
    };
  }

  /* =========================================================
CREATE FUNCTION TRACE
========================================================= */

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

      angleMode: angleMode,

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

  /* =========================================================
PLOT FUNCTION
========================================================= */

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

  /* =========================================================
LINEAR NORMALIZATION
========================================================= */

  function normalizeLinearExpression(expression) {
    let expr = String(expression ?? "").trim();

    if (!expr) {
      throw new Error("لطفاً تابع درجه یک را وارد کنید.");
    }

    expr = expr.replace(/^\s*y\s*=\s*/i, "");

    expr = expr.replace(/\s+/g, "");

    expr = expr.replace(/−/g, "-");

    expr = expr.replace(/X/g, "x");

    if (!/[x]/.test(expr)) {
      throw new Error("تابع درجه یک باید شامل متغیر x باشد.");
    }

    return expr;
  }

  /* =========================================================
LINEAR TRACE
========================================================= */

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

  /* =========================================================
FORMAT LINEAR
========================================================= */

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

  /* =========================================================
PLOT LINEAR COEFFICIENTS
========================================================= */

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

  /* =========================================================
PLOT LINEAR EQUATION
========================================================= */

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

  /* =========================================================
LINEAR PREVIEW
========================================================= */

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

  /* =========================================================
EXAMPLES
========================================================= */

  function plotExamples() {
    const examples = [
      {
        expression: "sin(x)",

        name: "sin(x)",
      },

      {
        expression: "cos(x)",

        name: "cos(x)",
      },

      {
        expression: "tan(x)",

        name: "tan(x)",
      },

      {
        expression: "ln(x)",

        name: "ln(x)",
      },

      {
        expression: "log(x,2)",

        name: "log₂(x)",
      },

      {
        expression: "exp(x)",

        name: "eˣ",
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
        const isLinear = item.name.includes("y =");

        const trace = isLinear
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

  /* =========================================================
UPDATE GRAPH
========================================================= */

  function updateGraph() {
    if (!graphContainer || typeof window.Plotly === "undefined") {
      return;
    }

    const Plotly = getPlotly();

    const layout = {
      autosize: true,

      paper_bgcolor: "rgba(0,0,0,0)",

      plot_bgcolor: "#071321",

      font: {
        family: "Vazirmatn, Tahoma, sans-serif",

        color: "#ffffff",
      },

      xaxis: {
        title: angleMode === "deg" ? "X — حالت درجه" : "X — حالت رادیان",

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

    Plotly.react(
      graphContainer,

      graphs,

      layout,

      config,
    );
  }

  /* =========================================================
CLEAR
========================================================= */

  function clearGraphs() {
    graphs = [];

    updateGraph();

    updateFunctionList();

    saveGraphs();
  }

  /* =========================================================
REMOVE GRAPH
========================================================= */

  function removeGraph(index) {
    if (index < 0 || index >= graphs.length) {
      return;
    }

    graphs.splice(index, 1);

    updateGraph();

    updateFunctionList();

    saveGraphs();
  }

  /* =========================================================
RESET ZOOM
========================================================= */

  function resetZoom() {
    if (!graphContainer || typeof window.Plotly === "undefined") {
      return;
    }

    window.Plotly.relayout(
      graphContainer,

      {
        "xaxis.autorange": true,

        "yaxis.autorange": true,
      },
    );
  }

  /* =========================================================
ZOOM IN
========================================================= */

  function zoomIn() {
    if (!graphContainer?.layout?.xaxis || !graphContainer?.layout?.yaxis) {
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

    window.Plotly.relayout(
      graphContainer,

      {
        "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

        "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
      },
    );
  }

  /* =========================================================
ZOOM OUT
========================================================= */

  function zoomOut() {
    if (!graphContainer?.layout?.xaxis || !graphContainer?.layout?.yaxis) {
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

    window.Plotly.relayout(
      graphContainer,

      {
        "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

        "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
      },
    );
  }

  /* =========================================================
FUNCTION LIST
========================================================= */

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

      type.textContent =
        graph.graphType === "linear"
          ? "درجه یک"
          : `تابع — ${graph.angleMode === "deg" ? "درجه" : "رادیان"}`;

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

  /* =========================================================
SAVE
========================================================= */

  function saveGraphs() {
    try {
      const data = graphs.map((graph) => ({
        graphType: graph.graphType,

        expression: graph.expression,

        name: graph.name,

        angleMode: graph.angleMode || "rad",
      }));

      window.localStorage.setItem(
        GRAPH_CONFIG.storageKey,

        JSON.stringify(data),
      );
    } catch (error) {
      console.warn("Save error:", error);
    }
  }

  /* =========================================================
LOAD
========================================================= */

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

          const oldAngleMode = angleMode;

          if (item.angleMode === "deg" || item.angleMode === "rad") {
            setAngleMode(item.angleMode);
          }

          const trace =
            item.graphType === "linear"
              ? createLinearTraceFromEquation(
                  item.expression,

                  {
                    ...settings,

                    name: item.name || item.expression,
                  },
                )
              : createFunctionTrace(
                  item.expression,

                  {
                    ...settings,

                    name: item.name || item.expression,
                  },
                );

          graphs.push(trace);

          setAngleMode(oldAngleMode);
        } catch (error) {
          console.warn(
            "Graph load failed:",

            error,
          );
        }
      });

      updateGraph();

      updateFunctionList();
    } catch (error) {
      console.warn("Load error:", error);
    }
  }

  /* =========================================================
HOVER
========================================================= */

  function setupHover() {
    if (!graphContainer || !pointInfo) {
      return;
    }

    graphContainer.on(
      "plotly_hover",

      (data) => {
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
      },
    );

    graphContainer.on(
      "plotly_unhover",

      () => {
        pointInfo.textContent =
          "برای مشاهده مختصات، نشانگر را روی نمودار حرکت دهید.";
      },
    );
  }

  /* =========================================================
EVENT LISTENERS
========================================================= */

  function setupEvents() {
    /* Normal Function */

    if (plotBtn) {
      plotBtn.addEventListener(
        "click",

        () => {
          const expression = functionInput?.value.trim() || "";

          if (plotFunction(expression)) {
            if (functionInput) {
              functionInput.value = "";

              functionInput.focus();
            }
          }
        },
      );
    }

    /* Enter */

    if (functionInput) {
      functionInput.addEventListener(
        "keydown",

        (event) => {
          if (event.key === "Enter") {
            event.preventDefault();

            plotBtn?.click();
          }
        },
      );
    }

    /* Linear */

    if (plotLinearBtn) {
      plotLinearBtn.addEventListener(
        "click",

        () => {
          const directEquation = linearEquationInput?.value.trim() || "";

          if (directEquation) {
            if (plotLinearByEquation() && linearEquationInput) {
              linearEquationInput.value = "";
            }
          } else {
            plotLinearByCoefficients();
          }
        },
      );
    }

    /* Linear Enter */

    if (linearEquationInput) {
      linearEquationInput.addEventListener(
        "keydown",

        (event) => {
          if (event.key === "Enter") {
            event.preventDefault();

            plotLinearBtn?.click();
          }
        },
      );
    }

    /* Preview */

    linearAInput?.addEventListener(
      "input",

      updateLinearPreview,
    );

    linearBInput?.addEventListener(
      "input",

      updateLinearPreview,
    );

    /* Examples */

    examplesBtn?.addEventListener(
      "click",

      () => {
        try {
          plotExamples();
        } catch (error) {
          alert(error.message || "خطا در رسم مثال‌ها.");
        }
      },
    );

    /* Clear */

    clearBtn?.addEventListener(
      "click",

      () => {
        if (graphs.length === 0) {
          return;
        }

        if (confirm("آیا می‌خواهید تمام نمودارها حذف شوند؟")) {
          clearGraphs();
        }
      },
    );

    /* Zoom */

    resetZoomBtn?.addEventListener(
      "click",

      resetZoom,
    );

    zoomInBtn?.addEventListener(
      "click",

      zoomIn,
    );

    zoomOutBtn?.addEventListener(
      "click",

      zoomOut,
    );

    /* Mobile Menu */

    if (menuButton && sidebar) {
      menuButton.addEventListener(
        "click",

        () => {
          sidebar.classList.toggle("open");
        },
      );
    }

    /* Close Sidebar */

    if (sidebar) {
      sidebar.querySelectorAll("a").forEach((link) => {
        link.addEventListener(
          "click",

          () => {
            sidebar.classList.remove("open");
          },
        );
      });
    }
  }

  /* =========================================================
RESIZE
========================================================= */

  window.addEventListener(
    "resize",

    () => {
      if (graphContainer && typeof window.Plotly !== "undefined") {
        window.Plotly.Plots.resize(graphContainer);
      }
    },
  );

  /* =========================================================
INITIALIZE
========================================================= */

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
      console.error("VAYRA Graph Engine: " + "عنصر #graph پیدا نشد.");

      return;
    }

    loadAngleMode();

    setupEvents();

    loadGraphs();

    updateLinearPreview();

    if (graphs.length === 0) {
      plotFunction(
        "sin(x)",

        {
          minX: -10,

          maxX: 10,

          samples: 4000,

          name: "sin(x)",
        },
      );
    }

    setupHover();
  }

  /* =========================================================
START
========================================================= */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",

      initialize,

      {
        once: true,
      },
    );
  } else {
    initialize();
  }

  /* =========================================================
GLOBAL API
========================================================= */

  window.VayraGraph = {
    plot: plotFunction,

    plotLinear: plotLinearByEquation,

    plotLinearByCoefficients: plotLinearByCoefficients,

    clear: clearGraphs,

    remove: removeGraph,

    resetZoom: resetZoom,

    zoomIn: zoomIn,

    zoomOut: zoomOut,

    setAngleMode: setAngleMode,

    getAngleMode: () => angleMode,
  };
})();
