/* =========================================================
   VAYRA - ADVANCED FUNCTION + LINE GRAPH ENGINE
   Requires: Plotly.js
   ========================================================= */

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const graphContainer = document.getElementById("graph");

const functionList = document.getElementById("functionList");

const pointInfo = document.getElementById("pointInfo");

const functionInput = document.getElementById("functionInput");

const plotFunctionBtn = document.getElementById("plotFunctionBtn");

const pointX = document.getElementById("pointX");

const pointY = document.getElementById("pointY");

const addPointBtn = document.getElementById("addPointBtn");

const plotLineBtn = document.getElementById("plotLineBtn");

const clearPointsBtn = document.getElementById("clearPointsBtn");

const pendingPoints = document.getElementById("pendingPoints");

const clearGraphsBtn = document.getElementById("clearGraphsBtn");

const resetZoomBtn = document.getElementById("resetZoomBtn");

const zoomInBtn = document.getElementById("zoomInBtn");

const zoomOutBtn = document.getElementById("zoomOutBtn");

const menuButton = document.getElementById("menuButton");

const sidebar = document.getElementById("sidebar");

/* =========================================================
   GLOBAL DATA
   ========================================================= */

let graphs = [];

let pendingLinePoints = [];

/* =========================================================
   SETTINGS
   ========================================================= */

const GRAPH_CONFIG = {
  minX: -10,

  maxX: 10,

  samples: 4000,

  maxSamples: 20000,

  maxY: 1e10,

  storageKey: "vayra_graphs_v2",
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
   MATH FUNCTIONS
   ========================================================= */

const mathFunctions = {
  sin: Math.sin,

  cos: Math.cos,

  tan: Math.tan,

  asin: Math.asin,

  acos: Math.acos,

  atan: Math.atan,

  sinh: Math.sinh,

  cosh: Math.cosh,

  tanh: Math.tanh,

  sqrt: Math.sqrt,

  abs: Math.abs,

  log: Math.log,

  log10: Math.log10,

  exp: Math.exp,

  floor: Math.floor,

  ceil: Math.ceil,

  round: Math.round,
};

/* =========================================================
   PREPARE EXPRESSION
   ========================================================= */

function prepareExpression(expression) {
  let expr = String(expression).trim();

  if (!expr) {
    throw new Error("لطفاً یک تابع وارد کنید.");
  }

  /* Remove y = */

  expr = expr.replace(/^\s*y\s*=\s*/i, "");

  /* Remove spaces */

  expr = expr.replace(/\s+/g, "");

  /* Mathematical symbols */

  expr = expr.replace(/π/gi, "Math.PI");

  expr = expr.replace(/\bpi\b/gi, "Math.PI");

  expr = expr.replace(/\be\b/g, "Math.E");

  /* Functions */

  Object.keys(mathFunctions).forEach(function (func) {
    const regex = new RegExp("\\b" + func + "\\s*\\(", "gi");

    expr = expr.replace(regex, "Math." + func + "(");
  });

  /* Power */

  expr = expr.replace(/\^/g, "**");

  /* Infinity */

  expr = expr.replace(/\binfinity\b/gi, "Infinity");

  return expr;
}

/* =========================================================
   CREATE FUNCTION
   ========================================================= */

function createFunction(expression) {
  const prepared = prepareExpression(expression);

  try {
    const func = new Function(
      "x",

      `
                "use strict";
                return (${prepared});
                `,
    );

    const test = func(1);

    if (typeof test !== "number") {
      throw new Error("Function must return a number.");
    }

    return func;
  } catch (error) {
    console.error("Function error:", error);

    throw new Error("فرمول وارد شده معتبر نیست.");
  }
}

/* =========================================================
   GENERATE X VALUES
   ========================================================= */

function generateXValues(minX, maxX, samples) {
  const values = [];

  samples = Math.max(100, Math.min(samples, GRAPH_CONFIG.maxSamples));

  const step = (maxX - minX) / (samples - 1);

  for (let i = 0; i < samples; i++) {
    values.push(minX + i * step);
  }

  return values;
}

/* =========================================================
   GENERATE FUNCTION POINTS
   ========================================================= */

function generatePoints(func, minX, maxX, samples) {
  const xValues = generateXValues(minX, maxX, samples);

  const yValues = [];

  let previousY = null;

  for (let i = 0; i < xValues.length; i++) {
    const x = xValues[i];

    let y;

    try {
      y = func(x);
    } catch {
      y = NaN;
    }

    if (!Number.isFinite(y) || Math.abs(y) > GRAPH_CONFIG.maxY) {
      yValues.push(null);

      previousY = null;

      continue;
    }

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

    line: {
      color: color,

      width: 2.5,
    },

    connectgaps: false,

    hovertemplate:
      "<b>%{fullData.name}</b>" +
      "<br>" +
      "x = %{x:.6f}" +
      "<br>" +
      "y = %{y:.6f}" +
      "<extra></extra>",
  };
}

/* =========================================================
   CREATE LINE TRACE
   ========================================================= */

function createLineTrace(points, options = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error("برای رسم نمودار خطی حداقل دو نقطه وارد کنید.");
  }

  const x = points.map((point) => point.x);

  const y = points.map((point) => point.y);

  const color = graphColors[graphs.length % graphColors.length];

  return {
    x: x,

    y: y,

    type: "scatter",

    mode: "lines+markers",

    name: options.name || "نمودار خطی",

    graphType: "line",

    points: points.map((point) => ({
      x: point.x,

      y: point.y,
    })),

    line: {
      color: color,

      width: 3,
    },

    marker: {
      size: 9,

      color: color,

      line: {
        color: "#ffffff",

        width: 1,
      },
    },

    connectgaps: true,

    hovertemplate:
      "<b>%{fullData.name}</b>" +
      "<br>" +
      "x = %{x:.6f}" +
      "<br>" +
      "y = %{y:.6f}" +
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

    const trace = createFunctionTrace(cleanExpression, options);

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
   ADD POINT
   ========================================================= */

function addPoint() {
  const x = Number(pointX.value);

  const y = Number(pointY.value);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    alert("لطفاً مقدار معتبر برای X و Y وارد کنید.");

    return;
  }

  pendingLinePoints.push({
    x: x,

    y: y,
  });

  renderPendingPoints();

  pointX.value = "";

  pointY.value = "";

  pointX.focus();
}

/* =========================================================
   RENDER PENDING POINTS
   ========================================================= */

function renderPendingPoints() {
  if (!pendingPoints) {
    return;
  }

  pendingPoints.innerHTML = "";

  if (pendingLinePoints.length === 0) {
    pendingPoints.innerHTML = `
            <div class="empty-points">
                هنوز نقطه‌ای وارد نشده است.
            </div>
            `;

    return;
  }

  pendingLinePoints.forEach(function (point, index) {
    const chip = document.createElement("div");

    chip.className = "point-chip";

    chip.innerHTML = `
                <span>
                    P${index + 1}
                    =
                    (${point.x}, ${point.y})
                </span>
                `;

    const removeButton = document.createElement("button");

    removeButton.type = "button";

    removeButton.textContent = "×";

    removeButton.title = "حذف نقطه";

    removeButton.addEventListener(
      "click",

      function () {
        removePendingPoint(index);
      },
    );

    chip.appendChild(removeButton);

    pendingPoints.appendChild(chip);
  });
}

/* =========================================================
   REMOVE PENDING POINT
   ========================================================= */

function removePendingPoint(index) {
  if (index < 0 || index >= pendingLinePoints.length) {
    return;
  }

  pendingLinePoints.splice(index, 1);

  renderPendingPoints();
}

/* =========================================================
   CLEAR PENDING POINTS
   ========================================================= */

function clearPendingPoints() {
  pendingLinePoints = [];

  renderPendingPoints();
}

/* =========================================================
   PLOT LINE
   ========================================================= */

function plotLine() {
  try {
    if (pendingLinePoints.length < 2) {
      throw new Error("برای رسم نمودار خطی حداقل دو نقطه وارد کنید.");
    }

    const points = pendingLinePoints.map((point) => ({
      x: point.x,

      y: point.y,
    }));

    const trace = createLineTrace(points, {
      name: "نمودار خطی " + (graphs.length + 1),
    });

    graphs.push(trace);

    updateGraph();

    updateFunctionList();

    saveGraphs();

    clearPendingPoints();
  } catch (error) {
    console.error(error);

    alert(error.message || "خطا در رسم نمودار خطی.");
  }
}

/* =========================================================
   UPDATE GRAPH
   ========================================================= */

function updateGraph() {
  if (!graphContainer) {
    return;
  }

  const layout = {
    title: {
      text: "VAYRA Function Graph",
    },

    paper_bgcolor: "rgba(0,0,0,0)",

    plot_bgcolor: "rgba(7,19,33,1)",

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

      autorange: true,

      fixedrange: false,
    },

    yaxis: {
      title: "Y",

      showgrid: true,

      gridcolor: "rgba(255,255,255,0.08)",

      zeroline: true,

      zerolinecolor: "#d4af37",

      autorange: true,

      fixedrange: false,
    },

    hovermode: "closest",

    dragmode: "pan",

    legend: {
      orientation: "h",

      y: -0.15,
    },

    margin: {
      l: 65,

      r: 30,

      t: 70,

      b: 90,
    },

    uirevision: "vayra-fixed",
  };

  const config = {
    responsive: true,

    scrollZoom: true,

    displayModeBar: true,

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
   CLEAR ALL GRAPHS
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
  if (!graphContainer) {
    return;
  }

  Plotly.relayout(
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
  if (!graphContainer || !graphContainer.layout) {
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

  Plotly.relayout(
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
  if (!graphContainer || !graphContainer.layout) {
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

  Plotly.relayout(
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
    functionList.innerHTML = `
            <div class="function-row">
                <span>
                    هنوز نموداری رسم نشده است.
                </span>
            </div>
            `;

    return;
  }

  graphs.forEach(function (graph, index) {
    const row = document.createElement("div");

    row.className = "function-row";

    const span = document.createElement("span");

    span.textContent =
      graph.graphType === "line"
        ? formatLinePoints(graph.points)
        : graph.expression;

    const type = document.createElement("span");

    type.className = "graph-type";

    type.textContent = graph.graphType === "line" ? "خطی" : "تابع";

    const button = document.createElement("button");

    button.className = "danger-btn";

    button.textContent = "حذف";

    button.type = "button";

    button.addEventListener(
      "click",

      function () {
        removeGraph(index);
      },
    );

    row.appendChild(span);

    row.appendChild(type);

    row.appendChild(button);

    functionList.appendChild(row);
  });
}

/* =========================================================
   FORMAT LINE POINTS
   ========================================================= */

function formatLinePoints(points) {
  if (!Array.isArray(points)) {
    return "نمودار خطی";
  }

  return points.map((point) => `(${point.x}, ${point.y})`).join(" → ");
}

/* =========================================================
   SAVE GRAPHS
   ========================================================= */

function saveGraphs() {
  try {
    const data = graphs.map(function (graph) {
      return {
        graphType: graph.graphType,

        expression: graph.expression,

        name: graph.name,

        points: graph.points,
      };
    });

    localStorage.setItem(
      GRAPH_CONFIG.storageKey,

      JSON.stringify(data),
    );
  } catch (error) {
    console.warn("Save error:", error);
  }
}

/* =========================================================
   LOAD GRAPHS
   ========================================================= */

function loadGraphs() {
  try {
    const saved = localStorage.getItem(GRAPH_CONFIG.storageKey);

    if (!saved) {
      return;
    }

    const data = JSON.parse(saved);

    if (!Array.isArray(data)) {
      return;
    }

    data.forEach(function (item) {
      if (!item) {
        return;
      }

      try {
        if (item.graphType === "line" && Array.isArray(item.points)) {
          const trace = createLineTrace(
            item.points,

            {
              name: item.name || "نمودار خطی",
            },
          );

          graphs.push(trace);
        } else if (item.graphType === "function" && item.expression) {
          const trace = createFunctionTrace(
            item.expression,

            {
              name: item.name || item.expression,

              minX: GRAPH_CONFIG.minX,

              maxX: GRAPH_CONFIG.maxX,

              samples: GRAPH_CONFIG.samples,
            },
          );

          graphs.push(trace);
        }
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
   POINT INFORMATION / HOVER
   ========================================================= */

function setupHover() {
  if (!graphContainer || !pointInfo) {
    return;
  }

  graphContainer.on(
    "plotly_hover",

    function (data) {
      if (!data || !data.points || !data.points.length) {
        return;
      }

      const point = data.points[0];

      const x = Number(point.x);

      const y = Number(point.y);

      pointInfo.innerHTML = `

                <strong>
                    x = ${x.toFixed(8)}
                </strong>

                &nbsp;&nbsp;

                <strong>
                    y = ${y.toFixed(8)}
                </strong>

                `;
    },
  );

  graphContainer.on(
    "plotly_unhover",

    function () {
      pointInfo.innerHTML =
        "برای مشاهده مختصات، نشانگر را روی نمودار حرکت دهید.";
    },
  );
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEvents() {
  /* Function */

  if (plotFunctionBtn) {
    plotFunctionBtn.addEventListener(
      "click",

      function () {
        const expression = functionInput.value;

        if (plotFunction(expression)) {
          functionInput.value = "";

          functionInput.focus();
        }
      },
    );
  }

  /* Function Enter */

  if (functionInput) {
    functionInput.addEventListener(
      "keydown",

      function (event) {
        if (event.key === "Enter") {
          event.preventDefault();

          plotFunctionBtn.click();
        }
      },
    );
  }

  /* Add Point */

  if (addPointBtn) {
    addPointBtn.addEventListener(
      "click",

      addPoint,
    );
  }

  /* Point Enter */

  [pointX, pointY].forEach(function (input) {
    if (!input) {
      return;
    }

    input.addEventListener(
      "keydown",

      function (event) {
        if (event.key === "Enter") {
          event.preventDefault();

          addPoint();
        }
      },
    );
  });

  /* Plot Line */

  if (plotLineBtn) {
    plotLineBtn.addEventListener(
      "click",

      plotLine,
    );
  }

  /* Clear Pending */

  if (clearPointsBtn) {
    clearPointsBtn.addEventListener(
      "click",

      clearPendingPoints,
    );
  }

  /* Clear Graphs */

  if (clearGraphsBtn) {
    clearGraphsBtn.addEventListener(
      "click",

      function () {
        if (graphs.length === 0) {
          return;
        }

        if (confirm("آیا می‌خواهید همه نمودارها حذف شوند؟")) {
          clearGraphs();
        }
      },
    );
  }

  /* Zoom */

  if (resetZoomBtn) {
    resetZoomBtn.addEventListener(
      "click",

      resetZoom,
    );
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener(
      "click",

      zoomIn,
    );
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener(
      "click",

      zoomOut,
    );
  }

  /* Mobile Menu */

  if (menuButton && sidebar) {
    menuButton.addEventListener(
      "click",

      function () {
        sidebar.classList.toggle("open");
      },
    );
  }

  /* Close sidebar after click */

  if (sidebar) {
    sidebar.querySelectorAll("a").forEach(function (link) {
      link.addEventListener(
        "click",

        function () {
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

  function () {
    if (graphContainer && typeof Plotly !== "undefined") {
      Plotly.Plots.resize(graphContainer);
    }
  },
);

/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",

  function () {
    if (typeof Plotly === "undefined") {
      console.error("VAYRA Graph Engine: " + "Plotly.js is not loaded.");

      alert("کتابخانه Plotly.js بارگذاری نشده است.");

      return;
    }

    if (!graphContainer) {
      console.error("VAYRA Graph Engine: " + "#graph پیدا نشد.");

      return;
    }

    setupEvents();

    setupHover();

    renderPendingPoints();

    loadGraphs();

    /* Default Graph */

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
  },
);

/* =========================================================
   GLOBAL API
   ========================================================= */

window.VayraGraph = {
  plot: plotFunction,

  plotLine: function (points) {
    const trace = createLineTrace(points);

    graphs.push(trace);

    updateGraph();

    updateFunctionList();

    saveGraphs();
  },

  addPoint: addPoint,

  clear: clearGraphs,

  remove: removeGraph,

  resetZoom: resetZoom,

  zoomIn: zoomIn,

  zoomOut: zoomOut,
};
