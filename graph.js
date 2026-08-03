/* =========================================================
   VAYRA - PROFESSIONAL ADVANCED GRAPH ENGINE
   ---------------------------------------------------------
   Requires:
   - Plotly.js
   - Math.js
   ---------------------------------------------------------
   Features:
   - sin, cos, tan
   - cot, sec, csc
   - asin, acos, atan
   - sinh, cosh, tanh
   - sqrt, abs
   - log, ln, exp
   - pi, π, e
   - Multiple graphs
   - Asymptote detection
   - Smart discontinuity detection
   - LocalStorage persistence
   - Linear functions
   - Zoom controls
   - Hover coordinates
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     DOM ELEMENTS
     ========================================================= */

  const $ = (id) => document.getElementById(id);

  const graphContainer = $("graph");
  const functionList = $("functionList");
  const pointInfo = $("pointInfo");

  const functionInput = $("functionInput");
  const minXInput = $("minX");
  const maxXInput = $("maxX");
  const samplesInput = $("samples");

  const plotBtn = $("plotBtn");
  const plotLinearBtn = $("plotLinearBtn");

  const linearEquationInput = $("linearEquationInput");
  const linearAInput = $("linearA");
  const linearBInput = $("linearB");
  const linearPreview = $("linearPreview");

  const examplesBtn = $("examplesBtn");
  const clearBtn = $("clearBtn");

  const resetZoomBtn = $("resetZoomBtn");
  const zoomInBtn = $("zoomInBtn");
  const zoomOutBtn = $("zoomOutBtn");

  const menuButton = $("menuButton");
  const sidebar = $("sidebar");

  /* =========================================================
     GLOBAL STATE
     ========================================================= */

  let graphs = [];

  /* =========================================================
     CONFIGURATION
     ========================================================= */

  const CONFIG = {
    minX: -10,
    maxX: 10,

    samples: 4000,

    minSamples: 100,
    maxSamples: 20000,

    /*
     * اگر مقدار Y از این عدد بیشتر شود،
     * نقطه نامعتبر در نظر گرفته میشود.
     */
    maxY: 1e6,

    /*
     * اگر اختلاف دو نقطه خیلی زیاد باشد،
     * احتمالاً از مجانب عبور کردهایم.
     */
    maxJump: 1000,

    /*
     * فاصله تقریبی مجاز برای تشخیص پرش.
     */
    jumpFactor: 20,

    storageKey: "vayra_graphs_v4",

    colors: [
      "#d4af37",
      "#4ea1ff",
      "#48c987",
      "#ff6b81",
      "#b889ff",
      "#ff9f43",
      "#00d2d3",
      "#10ac84",
    ],
  };

  /* =========================================================
     LIBRARY CHECKS
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
     GRAPH SETTINGS
     ========================================================= */

  function getGraphSettings() {
    const minX = Number(minXInput?.value ?? CONFIG.minX);

    const maxX = Number(maxXInput?.value ?? CONFIG.maxX);

    let samples = Number(samplesInput?.value ?? CONFIG.samples);

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      throw new Error("محدوده X معتبر نیست.");
    }

    if (minX >= maxX) {
      throw new Error("حداقل X باید از حداکثر X کوچکتر باشد.");
    }

    if (!Number.isFinite(samples)) {
      throw new Error("دقت رسم معتبر نیست.");
    }

    samples = Math.floor(samples);

    if (samples < CONFIG.minSamples || samples > CONFIG.maxSamples) {
      throw new Error(
        `دقت رسم باید بین ${CONFIG.minSamples} و ${CONFIG.maxSamples} باشد.`,
      );
    }

    return {
      minX,
      maxX,
      samples,
    };
  }

  /* =========================================================
     NORMALIZE EXPRESSION
     ========================================================= */

  function prepareExpression(expression) {
    let expr = String(expression ?? "").trim();

    if (!expr) {
      throw new Error("لطفاً یک تابع وارد کنید.");
    }

    /*
     * Remove y =
     *
     * y = sin(x)
     * =>
     * sin(x)
     */

    expr = expr.replace(/^\s*y\s*=\s*/i, "");

    /*
     * Remove spaces
     */

    expr = expr.replace(/\s+/g, "");

    /*
     * Unicode normalization
     */

    expr = expr
      .replace(/π/gi, "pi")
      .replace(/−/g, "-")
      .replace(/×/g, "*")
      .replace(/÷/g, "/");

    /*
     * Normalize uppercase X
     */

    expr = expr.replace(/X/g, "x");

    /*
     * Common Persian/Unicode powers
     */

    expr = expr.replace(/²/g, "^2").replace(/³/g, "^3");

    /*
     * sin²(x)
     * =>
     * sin(x)^2
     *
     * cos²(x)
     * =>
     * cos(x)^2
     */

    expr = expr.replace(/(sin|cos|tan|cot|sec|csc)²(?=\()/gi, "$1^2");

    expr = expr.replace(/(sin|cos|tan|cot|sec|csc)³(?=\()/gi, "$1^3");

    /*
     * Common function aliases
     */

    expr = expr.replace(/\bln\(/gi, "log(").replace(/\blog10\(/gi, "log10(");

    return expr;
  }

  /* =========================================================
     CUSTOM FUNCTIONS
     ========================================================= */

  function registerCustomFunctions() {
    const math = getMath();

    /*
     * cot(x) = 1 / tan(x)
     */

    if (!math.expression.transform) {
      // Nothing required here.
    }

    /*
     * Register custom functions only once.
     */

    try {
      math.import(
        {
          cot: function (x) {
            return 1 / Math.tan(x);
          },

          sec: function (x) {
            return 1 / Math.cos(x);
          },

          csc: function (x) {
            return 1 / Math.sin(x);
          },
        },
        {
          override: false,
        },
      );
    } catch (error) {
      console.warn("Custom functions already registered.");
    }
  }

  /* =========================================================
     CREATE FUNCTION
     ========================================================= */

  function createFunction(expression) {
    const math = getMath();

    registerCustomFunctions();

    const prepared = prepareExpression(expression);

    let compiled;

    try {
      compiled = math.compile(prepared);
    } catch (error) {
      console.error("Compile error:", error);

      throw new Error(`فرمول «${expression}» معتبر نیست.`);
    }

    /*
     * Validate expression
     */

    try {
      const testResult = compiled.evaluate({
        x: 1,
      });

      if (!math.isNumeric(testResult)) {
        throw new Error("Function does not return a numeric value.");
      }
    } catch (error) {
      console.warn("Function validation warning:", error);

      /*
       * بعضی توابع ممکن است در x=1
       * تعریف نشده باشند.
       *
       * بنابراین اینجا خطا را
       * الزاماً Fatal نمیکنیم.
       */
    }

    /*
     * Return callable function
     */

    return function (x) {
      try {
        const result = compiled.evaluate({
          x,
        });

        const numeric = Number(result);

        if (!Number.isFinite(numeric)) {
          return NaN;
        }

        return numeric;
      } catch (error) {
        return NaN;
      }
    };
  }

  /* =========================================================
     GENERATE X VALUES
     ========================================================= */

  function generateXValues(minX, maxX, samples) {
    const values = [];

    const count = Math.max(
      CONFIG.minSamples,
      Math.min(Math.floor(samples), CONFIG.maxSamples),
    );

    const step = (maxX - minX) / (count - 1);

    for (let i = 0; i < count; i++) {
      values.push(minX + i * step);
    }

    return values;
  }

  /* =========================================================
     SMART POINT GENERATION
     ========================================================= */

  function generatePoints(func, minX, maxX, samples) {
    const xValues = generateXValues(minX, maxX, samples);

    const yValues = [];

    let previousX = null;
    let previousY = null;

    /*
     * Average expected Y movement.
     *
     * This is useful for detecting
     * vertical asymptotes.
     */

    const xStep = (maxX - minX) / (xValues.length - 1);

    for (let i = 0; i < xValues.length; i++) {
      const x = xValues[i];

      let y;

      try {
        y = Number(func(x));
      } catch {
        y = NaN;
      }

      /*
       * Invalid value
       */

      if (!Number.isFinite(y) || Math.abs(y) > CONFIG.maxY) {
        yValues.push(null);

        previousX = null;
        previousY = null;

        continue;
      }

      /*
       * Detect sudden vertical jump.
       *
       * Important for:
       *
       * tan(x)
       * cot(x)
       * sec(x)
       * csc(x)
       * 1/x
       */

      if (previousX !== null && previousY !== null) {
        const jump = Math.abs(y - previousY);

        /*
         * Dynamic jump threshold
         */

        const dynamicThreshold = Math.max(
          CONFIG.maxJump,
          Math.abs(previousY) * CONFIG.jumpFactor,
        );

        if (jump > dynamicThreshold) {
          yValues.push(null);

          previousX = null;
          previousY = null;

          continue;
        }

        /*
         * Extremely large X gap
         */

        if (Math.abs(x - previousX) > xStep * 2) {
          yValues.push(null);

          previousX = null;
          previousY = null;

          continue;
        }
      }

      /*
       * Valid point
       */

      yValues.push(y);

      previousX = x;
      previousY = y;
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
      : CONFIG.minX;

    const maxX = Number.isFinite(Number(options.maxX))
      ? Number(options.maxX)
      : CONFIG.maxX;

    const samples = Number.isFinite(Number(options.samples))
      ? Number(options.samples)
      : CONFIG.samples;

    const func = createFunction(expression);

    const points = generatePoints(func, minX, maxX, samples);

    const color = CONFIG.colors[graphs.length % CONFIG.colors.length];

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
        throw new Error("لطفاً یک تابع وارد کنید.");
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
      console.error("Plot function error:", error);

      alert(error.message || "خطا در رسم نمودار.");

      return false;
    }
  }

  /* =========================================================
     LINEAR FUNCTION
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

    if (!expr.includes("x")) {
      throw new Error("تابع درجه یک باید شامل متغیر x باشد.");
    }

    return expr;
  }

  /* =========================================================
     CREATE LINEAR TRACE
     ========================================================= */

  function createLinearTraceFromEquation(expression, options = {}) {
    const normalized = normalizeLinearExpression(expression);

    const func = createFunction(normalized);

    const minX = Number.isFinite(Number(options.minX))
      ? Number(options.minX)
      : CONFIG.minX;

    const maxX = Number.isFinite(Number(options.maxX))
      ? Number(options.maxX)
      : CONFIG.maxX;

    const samples = Number.isFinite(Number(options.samples))
      ? Number(options.samples)
      : CONFIG.samples;

    const points = generatePoints(func, minX, maxX, samples);

    const color = CONFIG.colors[graphs.length % CONFIG.colors.length];

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

      connectgaps: false,

      hovertemplate:
        "<b>%{fullData.name}</b>" +
        "<br>x = %{x:.6f}" +
        "<br>y = %{y:.6f}" +
        "<extra></extra>",
    };
  }

  /* =========================================================
     FORMAT LINEAR EQUATION
     ========================================================= */

  function formatLinearEquation(a, b) {
    let result;

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
     PLOT LINEAR BY COEFFICIENTS
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
     PLOT LINEAR BY EQUATION
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
        expression: "x^2",

        name: "x²",
      },

      {
        expression: "sqrt(x)",

        name: "√x",
      },

      {
        expression: "1/x",

        name: "1/x",
      },

      {
        expression: "sin(x) + cos(x)",

        name: "sin(x) + cos(x)",
      },

      {
        expression: "2*x + 3",

        name: "y = 2x + 3",

        linear: true,
      },
    ];

    const settings = getGraphSettings();

    examples.forEach((item) => {
      try {
        const trace = item.linear
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
     GRAPH LAYOUT
     ========================================================= */

  function getGraphLayout() {
    return {
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

      uirevision: "vayra-stable",
    };
  }

  /* =========================================================
     UPDATE GRAPH
     ========================================================= */

  function updateGraph() {
    if (!graphContainer) {
      return;
    }

    if (typeof window.Plotly === "undefined") {
      return;
    }

    const Plotly = getPlotly();

    const config = {
      responsive: true,

      scrollZoom: true,

      displayModeBar: true,

      displaylogo: false,

      doubleClick: "reset",

      modeBarButtonsToRemove: ["lasso2d", "select2d"],
    };

    Plotly.react(graphContainer, graphs, getGraphLayout(), config);
  }

  /* =========================================================
     CLEAR GRAPHS
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

    getPlotly().relayout(graphContainer, {
      "xaxis.autorange": true,

      "yaxis.autorange": true,
    });
  }

  /* =========================================================
     ZOOM IN
     ========================================================= */

  function zoomIn() {
    if (!graphContainer?.layout) {
      return;
    }

    const xRange = graphContainer.layout.xaxis?.range;

    const yRange = graphContainer.layout.yaxis?.range;

    if (!xRange || !yRange) {
      return;
    }

    const xCenter = (xRange[0] + xRange[1]) / 2;

    const yCenter = (yRange[0] + yRange[1]) / 2;

    const xHalf = (xRange[1] - xRange[0]) * 0.4;

    const yHalf = (yRange[1] - yRange[0]) * 0.4;

    getPlotly().relayout(graphContainer, {
      "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

      "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
    });
  }

  /* =========================================================
     ZOOM OUT
     ========================================================= */

  function zoomOut() {
    if (!graphContainer?.layout) {
      return;
    }

    const xRange = graphContainer.layout.xaxis?.range;

    const yRange = graphContainer.layout.yaxis?.range;

    if (!xRange || !yRange) {
      return;
    }

    const xCenter = (xRange[0] + xRange[1]) / 2;

    const yCenter = (yRange[0] + yRange[1]) / 2;

    const xHalf = (xRange[1] - xRange[0]) * 0.625;

    const yHalf = (yRange[1] - yRange[0]) * 0.625;

    getPlotly().relayout(graphContainer, {
      "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

      "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
    });
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

  /* =========================================================
     SAVE GRAPHS
     ========================================================= */

  function saveGraphs() {
    try {
      const data = graphs.map((graph) => ({
        graphType: graph.graphType,

        expression: graph.expression,

        name: graph.name,
      }));

      localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn("Save error:", error);
    }
  }

  /* =========================================================
     LOAD GRAPHS
     ========================================================= */

  function loadGraphs() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);

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
            minX: CONFIG.minX,

            maxX: CONFIG.maxX,

            samples: CONFIG.samples,
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

  /* =========================================================
     HOVER INFORMATION
     ========================================================= */

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

  /* =========================================================
     EVENT LISTENERS
     ========================================================= */

  function setupEvents() {
    /*
     * Normal Function
     */

    plotBtn?.addEventListener("click", () => {
      const expression = functionInput?.value.trim() || "";

      if (plotFunction(expression)) {
        functionInput.value = "";

        functionInput.focus();
      }
    });

    /*
     * Enter => Plot
     */

    functionInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        plotBtn?.click();
      }
    });

    /*
     * Linear Function
     */

    plotLinearBtn?.addEventListener("click", () => {
      const directEquation = linearEquationInput?.value.trim() || "";

      if (directEquation) {
        if (plotLinearByEquation()) {
          linearEquationInput.value = "";
        }
      } else {
        plotLinearByCoefficients();
      }
    });

    /*
     * Linear Enter
     */

    linearEquationInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        plotLinearBtn?.click();
      }
    });

    /*
     * Linear Preview
     */

    linearAInput?.addEventListener("input", updateLinearPreview);

    linearBInput?.addEventListener("input", updateLinearPreview);

    /*
     * Examples
     */

    examplesBtn?.addEventListener("click", () => {
      try {
        plotExamples();
      } catch (error) {
        alert(error.message || "خطا در رسم مثالها.");
      }
    });

    /*
     * Clear
     */

    clearBtn?.addEventListener("click", () => {
      if (graphs.length === 0) {
        return;
      }

      if (confirm("آیا میخواهید تمام نمودارها حذف شوند؟")) {
        clearGraphs();
      }
    });

    /*
     * Zoom Controls
     */

    resetZoomBtn?.addEventListener("click", resetZoom);

    zoomInBtn?.addEventListener("click", zoomIn);

    zoomOutBtn?.addEventListener("click", zoomOut);

    /*
     * Mobile Menu
     */

    menuButton?.addEventListener("click", () => {
      sidebar?.classList.toggle("open");
    });

    /*
     * Close Sidebar
     */

    sidebar?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        sidebar.classList.remove("open");
      });
    });
  }

  /* =========================================================
     RESIZE
     ========================================================= */

  window.addEventListener("resize", () => {
    if (graphContainer && typeof window.Plotly !== "undefined") {
      window.Plotly.Plots.resize(graphContainer);
    }
  });

  /* =========================================================
     INITIALIZE
     ========================================================= */

  function initialize() {
    try {
      getMath();

      getPlotly();
    } catch (error) {
      alert(error.message);

      return;
    }

    if (!graphContainer) {
      console.error("VAYRA Graph Engine: #graph not found.");

      return;
    }

    registerCustomFunctions();

    setupEvents();

    /*
     * Load saved graphs
     */

    loadGraphs();

    /*
     * Update linear preview
     */

    updateLinearPreview();

    /*
     * Default graph
     */

    if (graphs.length === 0) {
      plotFunction("sin(x)", {
        minX: -10,

        maxX: 10,

        samples: 4000,

        name: "sin(x)",
      });
    }

    /*
     * Setup hover
     */

    setupHover();
  }

  /* =========================================================
     START ENGINE
     ========================================================= */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true,
    });
  } else {
    initialize();
  }

  /* =========================================================
     PUBLIC API
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

    getGraphs: () => [...graphs],
  };
})();
