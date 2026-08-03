javascript(
  /* =========================================================
   VAYRA - ADVANCED GRAPH ENGINE
   Version: Stable Final
   Requires:
   - Plotly.js
   - Math.js
   ========================================================= */

  () => {
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

      minSamples: 100,
      maxSamples: 20000,

      maxY: 1e10,

      storageKey: "vayra_graphs_v5",
      angleModeKey: "vayra_angle_mode_v2",
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
     ANGLE MODE
     ========================================================= */

    function setAngleMode(mode) {
      if (mode !== "rad" && mode !== "deg") {
        mode = "rad";
      }

      angleMode = mode;

      try {
        window.localStorage.setItem(GRAPH_CONFIG.angleModeKey, angleMode);
      } catch (error) {
        console.warn("Could not save angle mode:", error);
      }
    }

    function loadAngleMode() {
      try {
        const saved = window.localStorage.getItem(GRAPH_CONFIG.angleModeKey);

        if (saved === "rad" || saved === "deg") {
          angleMode = saved;
        }
      } catch (error) {
        console.warn("Could not load angle mode:", error);
      }
    }

    function toRadians(value) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return NaN;
      }

      if (angleMode === "deg") {
        return (number * Math.PI) / 180;
      }

      return number;
    }

    function fromRadians(value) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return NaN;
      }

      if (angleMode === "deg") {
        return (number * 180) / Math.PI;
      }

      return number;
    }

    /* =========================================================
     CUSTOM MATH SCOPE
     ========================================================= */

    function createMathScope() {
      return {
        pi: Math.PI,

        e: Math.E,

        /* ---------- ANGLE CONVERSION ---------- */

        deg: function (x) {
          return (Number(x) * 180) / Math.PI;
        },

        rad: function (x) {
          return (Number(x) * Math.PI) / 180;
        },

        /* ---------- TRIGONOMETRY ---------- */

        sin: function (x) {
          return Math.sin(toRadians(x));
        },

        cos: function (x) {
          return Math.cos(toRadians(x));
        },

        tan: function (x) {
          const radians = toRadians(x);

          const cosValue = Math.cos(radians);

          if (Math.abs(cosValue) < 1e-12) {
            return NaN;
          }

          return Math.tan(radians);
        },

        /* ---------- INVERSE TRIGONOMETRY ---------- */

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

        /* ---------- HYPERBOLIC ---------- */

        sinh: function (x) {
          return Math.sinh(Number(x));
        },

        cosh: function (x) {
          return Math.cosh(Number(x));
        },

        tanh: function (x) {
          return Math.tanh(Number(x));
        },

        /* ---------- LOGARITHMS ---------- */

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

        /*
        log(x)
        پیش‌فرض: پایه 10

        log(x, 2)
        لگاریتم پایه 2

        log2(x)
        قبل از compile به log(x,2) تبدیل می‌شود.
      */

        log: function (x, base) {
          const value = Number(x);

          if (!Number.isFinite(value) || value <= 0) {
            return NaN;
          }

          if (typeof base === "undefined") {
            return Math.log10(value);
          }

          const b = Number(base);

          if (!Number.isFinite(b) || b <= 0 || b === 1) {
            return NaN;
          }

          return Math.log(value) / Math.log(b);
        },

        /* ---------- EXPONENTIAL ---------- */

        exp: function (x) {
          return Math.exp(Number(x));
        },

        /* ---------- BASIC ---------- */

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

      /* y = ... */

      expr = expr.replace(/^\s*y\s*=\s*/i, "");

      /* Remove spaces */

      expr = expr.replace(/\s+/g, "");

      /* Persian / Unicode */

      expr = expr.replace(/π/gi, "pi");

      expr = expr.replace(/−/g, "-");

      /* Uppercase X */

      expr = expr.replace(/X/g, "x");

      /*
      log2(x)
      log3(x)
      log10(x)

      تبدیل به:
      log(x,2)
      log(x,3)
      log10(x)
    */

      expr = expr.replace(
        /log(\d+)\(([^()]*)\)/gi,
        function (match, base, value) {
          if (base === "10") {
            return "log10(" + value + ")";
          }

          return "log(" + value + "," + base + ")";
        },
      );

      return expr;
    }

    /* =========================================================
     FORMULA ERROR
     ========================================================= */

    function getDetailedError(expression, error) {
      const message = String(error?.message || error || "");

      if (/Undefined symbol/i.test(message)) {
        const match = message.match(/Undefined symbol\s+([^\s]+)/i);

        const symbol = match?.[1] || "ناشناخته";

        return (
          "نماد یا تابع «" + symbol + "» شناخته نشد. " + "فرمول را بررسی کنید."
        );
      }

      if (/Parenthesis/i.test(message) || /parentheses/i.test(message)) {
        return (
          "پرانتزهای فرمول صحیح نیستند. " +
          "پرانتزهای باز و بسته را بررسی کنید."
        );
      }

      if (/Unexpected end/i.test(message)) {
        return (
          "فرمول ناقص است. " + "احتمالاً یک پرانتز یا عملگر بسته نشده است."
        );
      }

      if (/Unexpected token/i.test(message)) {
        return "در فرمول یک علامت یا کاراکتر غیرمنتظره وجود دارد.";
      }

      if (/Undefined function/i.test(message)) {
        return "تابع وارد شده در Math.js یا موتور VAYRA تعریف نشده است.";
      }

      return (
        "فرمول «" +
        expression +
        "» معتبر نیست. " +
        "جزئیات: " +
        (message || "خطای ناشناخته")
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

        const node = math.parse(prepared);

        const compiled = node.compile();

        /*
        Test expression
      */

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
              x: x,
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
        samples < GRAPH_CONFIG.minSamples ||
        samples > GRAPH_CONFIG.maxSamples
      ) {
        throw new Error("دقت رسم باید بین 100 تا 20000 باشد.");
      }

      return {
        minX: minX,
        maxX: maxX,
        samples: Math.floor(samples),
      };
    }

    /* =========================================================
     GENERATE X VALUES
     ========================================================= */

    function generateXValues(minX, maxX, samples) {
      const safeSamples = Math.max(
        GRAPH_CONFIG.minSamples,
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
     GENERATE POINTS
     ========================================================= */

    function generatePoints(func, minX, maxX, samples) {
      const xValues = generateXValues(minX, maxX, samples);

      const rawY = new Array(xValues.length);

      /*
      First pass
    */

      for (let i = 0; i < xValues.length; i++) {
        try {
          const y = Number(func(xValues[i]));

          rawY[i] = Number.isFinite(y) ? y : NaN;
        } catch {
          rawY[i] = NaN;
        }
      }

      const yValues = new Array(rawY.length);

      /*
      Second pass
      Detect discontinuities
    */

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

        /*
        Detect very large jumps.

        این قسمت برای جلوگیری از
        وصل شدن دو طرف مجانب است.
      */

        if (Number.isFinite(previous) && Number.isFinite(next)) {
          const leftJump = Math.abs(current - previous);

          const rightJump = Math.abs(next - current);

          const threshold = Math.max(1000, Math.abs(current) * 25);

          if (leftJump > threshold || rightJump > threshold) {
            yValues[i] = null;
            continue;
          }
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
          color: color,
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

      if (!/[x]/.test(expr)) {
        throw new Error("تابع درجه یک باید شامل متغیر x باشد.");
      }

      return expr;
    }

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

        name: options.name || "y = " + normalized,

        graphType: "linear",

        expression: "y = " + normalized,

        angleMode: angleMode,

        line: {
          color: color,
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

    function formatLinearEquation(a, b) {
      let result = "";

      if (a === 1) {
        result = "x";
      } else if (a === -1) {
        result = "-x";
      } else {
        result = String(a) + "x";
      }

      if (b > 0) {
        result += " + " + String(b);
      } else if (b < 0) {
        result += " - " + String(Math.abs(b));
      }

      return "y = " + result;
    }

    function plotLinearByCoefficients() {
      try {
        const a = Number(linearAInput?.value);

        const b = Number(linearBInput?.value);

        if (!Number.isFinite(a) || !Number.isFinite(b)) {
          throw new Error("مقدار a و b باید عدد معتبر باشند.");
        }

        const settings = getGraphSettings();

        const expression = String(a) + "*x+" + String(b);

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
          expression: "asin(x)",
          name: "asin(x)",
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
          expression: "2*x+3",
          name: "y = 2x + 3",
        },
      ];

      const settings = getGraphSettings();

      examples.forEach(function (item) {
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
          title: angleMode === "deg" ? "X — درجه" : "X — رادیان",

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
      };

      Plotly.react(graphContainer, graphs, layout, config);
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
     REMOVE
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

      window.Plotly.relayout(graphContainer, {
        "xaxis.autorange": true,

        "yaxis.autorange": true,
      });
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

      window.Plotly.relayout(graphContainer, {
        "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

        "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
      });
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

      window.Plotly.relayout(graphContainer, {
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

      graphs.forEach(function (graph, index) {
        const row = document.createElement("div");

        row.className = "function-row";

        const span = document.createElement("span");

        span.textContent = graph.name || graph.expression || "نمودار";

        const type = document.createElement("span");

        type.className = "graph-type";

        type.textContent =
          graph.graphType === "linear"
            ? "درجه یک"
            : "تابع — " + (graph.angleMode === "deg" ? "درجه" : "رادیان");

        const button = document.createElement("button");

        button.className = "danger-btn";

        button.type = "button";

        button.textContent = "حذف";

        button.addEventListener("click", function () {
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
        const data = graphs.map(function (graph) {
          return {
            graphType: graph.graphType,

            expression: graph.expression,

            name: graph.name,

            angleMode: graph.angleMode || "rad",
          };
        });

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

        data.forEach(function (item) {
          if (!item || !item.expression) {
            return;
          }

          try {
            const settings = {
              minX: GRAPH_CONFIG.minX,

              maxX: GRAPH_CONFIG.maxX,

              samples: GRAPH_CONFIG.samples,
            };

            const oldMode = angleMode;

            if (item.angleMode === "deg" || item.angleMode === "rad") {
              angleMode = item.angleMode;
            }

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

            angleMode = oldMode;
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
     HOVER
     ========================================================= */

    function setupHover() {
      if (!graphContainer || !pointInfo) {
        return;
      }

      graphContainer.on("plotly_hover", function (data) {
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
          "<strong>x = " +
          x.toFixed(8) +
          "</strong>" +
          "&nbsp;&nbsp;" +
          "<strong>y = " +
          y.toFixed(8) +
          "</strong>";
      });

      graphContainer.on("plotly_unhover", function () {
        pointInfo.textContent =
          "برای مشاهده مختصات، نشانگر را روی نمودار حرکت دهید.";
      });
    }

    /* =========================================================
     QUICK FUNCTIONS
     
     مهم:
     این بخش باید داخل همین IIFE باشد.
     در نسخه قبلی شما بیرون IIFE بود و به همین دلیل
     functionInput و plotFunction را نمی‌شناخت.
     ========================================================= */

    function setupQuickFunctions() {
      const quickButtons = document.querySelectorAll(".quick-function");

      quickButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          const expression = button.dataset.function;

          if (!expression) {
            return;
          }

          /*
              قرار دادن تابع در Input
            */

          if (functionInput) {
            functionInput.value = expression;
          }

          /*
              رسم تابع
            */

          plotFunction(expression);
        });
      });
    }

    /* =========================================================
     EVENT LISTENERS
     ========================================================= */

    function setupEvents() {
      /* ---------- NORMAL FUNCTION ---------- */

      if (plotBtn) {
        plotBtn.addEventListener("click", function () {
          const expression = functionInput?.value.trim() || "";

          if (plotFunction(expression)) {
            if (functionInput) {
              functionInput.value = "";

              functionInput.focus();
            }
          }
        });
      }

      /* ---------- NORMAL ENTER ---------- */

      if (functionInput) {
        functionInput.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault();

            plotBtn?.click();
          }
        });
      }

      /* ---------- LINEAR ---------- */

      if (plotLinearBtn) {
        plotLinearBtn.addEventListener("click", function () {
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

      /* ---------- LINEAR ENTER ---------- */

      if (linearEquationInput) {
        linearEquationInput.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault();

            plotLinearBtn?.click();
          }
        });
      }

      /* ---------- PREVIEW ---------- */

      linearAInput?.addEventListener("input", updateLinearPreview);

      linearBInput?.addEventListener("input", updateLinearPreview);

      /* ---------- EXAMPLES ---------- */

      examplesBtn?.addEventListener("click", function () {
        try {
          plotExamples();
        } catch (error) {
          alert(error.message || "خطا در رسم مثال‌ها.");
        }
      });

      /* ---------- CLEAR ---------- */

      clearBtn?.addEventListener("click", function () {
        if (graphs.length === 0) {
          return;
        }

        if (confirm("آیا می‌خواهید تمام نمودارها حذف شوند؟")) {
          clearGraphs();
        }
      });

      /* ---------- ZOOM ---------- */

      resetZoomBtn?.addEventListener("click", resetZoom);

      zoomInBtn?.addEventListener("click", zoomIn);

      zoomOutBtn?.addEventListener("click", zoomOut);

      /* ---------- MOBILE MENU ---------- */

      if (menuButton && sidebar) {
        menuButton.addEventListener("click", function () {
          sidebar.classList.toggle("open");
        });
      }

      /* ---------- CLOSE SIDEBAR ---------- */

      if (sidebar) {
        sidebar.querySelectorAll("a").forEach(function (link) {
          link.addEventListener("click", function () {
            sidebar.classList.remove("open");
          });
        });
      }
    }

    /* =========================================================
     RESIZE
     ========================================================= */

    window.addEventListener("resize", function () {
      if (graphContainer && typeof window.Plotly !== "undefined") {
        window.Plotly.Plots.resize(graphContainer);
      }
    });

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
        console.error("VAYRA Graph Engine: عنصر #graph پیدا نشد.");

        return;
      }

      loadAngleMode();

      setupEvents();

      setupQuickFunctions();

      loadGraphs();

      updateLinearPreview();

      if (graphs.length === 0) {
        plotFunction("sin(x)", {
          minX: -10,

          maxX: 10,

          samples: 4000,

          name: "sin(x)",
        });
      }

      setupHover();
    }

    /* =========================================================
     START
     ========================================================= */

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize, {
        once: true,
      });
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

      getAngleMode: function () {
        return angleMode;
      },
    };
  },
)();
