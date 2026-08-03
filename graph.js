/* =========================================================
   VAYRA - GRAPH ENGINE
   Plotly.js + Math.js
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  // ---------------------------------------------------------
  // ELEMENTS
  // ---------------------------------------------------------

  const functionInput = document.getElementById("functionInput");
  const plotBtn = document.getElementById("plotBtn");
  const clearBtn = document.getElementById("clearBtn");
  const examplesBtn = document.getElementById("examplesBtn");

  const resetZoomBtn = document.getElementById("resetZoomBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");

  const minXInput = document.getElementById("minX");
  const maxXInput = document.getElementById("maxX");
  const samplesInput = document.getElementById("samples");

  const graphElement = document.getElementById("graph");
  const functionList = document.getElementById("functionList");
  const pointInfo = document.getElementById("pointInfo");

  // Linear function elements
  const linearEquationInput = document.getElementById("linearEquationInput");

  const linearAInput = document.getElementById("linearA");
  const linearBInput = document.getElementById("linearB");

  const linearPreview = document.getElementById("linearPreview");
  const plotLinearBtn = document.getElementById("plotLinearBtn");

  // ---------------------------------------------------------
  // CHECK LIBRARIES
  // ---------------------------------------------------------

  if (typeof Plotly === "undefined") {
    alert("خطا: کتابخانه Plotly.js بارگذاری نشده است.");
    return;
  }

  if (typeof math === "undefined") {
    alert("خطا: کتابخانه Math.js بارگذاری نشده است.");
    return;
  }

  // ---------------------------------------------------------
  // VARIABLES
  // ---------------------------------------------------------

  let traces = [];

  // ---------------------------------------------------------
  // GRAPH LAYOUT
  // محورهای اصلی X و Y به صورت پررنگ
  // ---------------------------------------------------------

  let graphLayout = {
    title: {
      text: "نمودار تابع",
      font: {
        size: 22,
      },
    },

    xaxis: {
      title: {
        text: "X",
        font: {
          size: 16,
          color: "#000000",
        },
      },

      // محور اصلی X در x = 0
      zeroline: true,
      zerolinecolor: "#f0fc08",
      zerolinewidth: 4,

      // خطوط شبکه
      showgrid: true,
      gridcolor: "#dddddd",
      gridwidth: 1,

      // خط اطراف محور
      showline: true,
      linecolor: "#000000",
      linewidth: 2,

      // تیک‌های محور
      ticks: "outside",
      tickcolor: "#000000",
      tickwidth: 1,
      ticklen: 5,

      // نمایش اعداد محور
      showticklabels: true,
    },

    yaxis: {
      title: {
        text: "Y",
        font: {
          size: 16,
          color: "#000000",
        },
      },

      // محور اصلی Y در y = 0
      zeroline: true,
      zerolinecolor: "#fbff0c",
      zerolinewidth: 4,

      // خطوط شبکه
      showgrid: true,
      gridcolor: "#dddddd",
      gridwidth: 1,

      // خط اطراف محور
      showline: true,
      linecolor: "#000000",
      linewidth: 2,

      // تیک‌های محور
      ticks: "outside",
      tickcolor: "#000000",
      tickwidth: 1,
      ticklen: 5,

      // نمایش اعداد محور
      showticklabels: true,
    },

    hovermode: false,

    dragmode: "pan",

    margin: {
      l: 60,
      r: 30,
      t: 70,
      b: 60,
    },

    paper_bgcolor: "rgba(0,0,0,0)",

    plot_bgcolor: "rgba(0,0,0,0)",
  };

  // ---------------------------------------------------------
  // GRAPH CONFIG
  // ---------------------------------------------------------

  const graphConfig = {
    responsive: true,

    displaylogo: false,

    scrollZoom: true,

    displayModeBar: false,
  };

  // ---------------------------------------------------------
  // INITIAL GRAPH
  // ---------------------------------------------------------

  Plotly.newPlot(graphElement, [], graphLayout, graphConfig);

  // ---------------------------------------------------------
  // CREATE X VALUES
  // ---------------------------------------------------------

  function createXValues(minX, maxX, samples) {
    const x = [];

    const step = (maxX - minX) / (samples - 1);

    for (let i = 0; i < samples; i++) {
      x.push(minX + i * step);
    }

    return x;
  }

  // ---------------------------------------------------------
  // EVALUATE FUNCTION
  // ---------------------------------------------------------

  function evaluateFunction(expression, x) {
    try {
      const scope = {
        x: x,
      };

      return math.evaluate(expression, scope);
    } catch (error) {
      return NaN;
    }
  }

  // ---------------------------------------------------------
  // GENERATE Y VALUES
  // ---------------------------------------------------------

  function createYValues(expression, xValues) {
    return xValues.map(function (x) {
      const y = evaluateFunction(expression, x);

      if (typeof y !== "number" || !Number.isFinite(y)) {
        return null;
      }

      // جلوگیری از نمایش خطوط خیلی بزرگ
      if (Math.abs(y) > 1e10) {
        return null;
      }

      return y;
    });
  }

  // ---------------------------------------------------------
  // GET RANGE
  // ---------------------------------------------------------

  function getRange() {
    const minX = Number(minXInput.value);
    const maxX = Number(maxXInput.value);

    let samples = Number(samplesInput.value);

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      alert("محدوده X معتبر نیست.");
      return null;
    }

    if (minX >= maxX) {
      alert("حداقل X باید از حداکثر X کوچکتر باشد.");

      return null;
    }

    if (!Number.isFinite(samples)) {
      samples = 3000;
    }

    samples = Math.max(100, Math.min(20000, samples));

    samplesInput.value = samples;

    return {
      minX,
      maxX,
      samples,
    };
  }

  // ---------------------------------------------------------
  // NORMALIZE EXPRESSION
  // ---------------------------------------------------------

  function normalizeExpression(expression) {
    let result = expression.trim();

    // حذف y =
    result = result.replace(/^y\s*=\s*/i, "");

    // تبدیل ورودی‌های فارسی
    result = result
      .replace(/سین/g, "sin")
      .replace(/کسینوس/g, "cos")
      .replace(/تانژانت/g, "tan");

    return result;
  }

  // ---------------------------------------------------------
  // PLOT FUNCTION
  // ---------------------------------------------------------

  function plotFunction(expression, label = null) {
    const range = getRange();

    if (!range) {
      return;
    }

    expression = normalizeExpression(expression);

    if (!expression) {
      alert("لطفاً یک تابع وارد کنید.");

      return;
    }

    const xValues = createXValues(range.minX, range.maxX, range.samples);

    const yValues = createYValues(expression, xValues);

    const validPoints = yValues.filter((value) => value !== null);

    if (validPoints.length === 0) {
      alert("تابع قابل رسم نیست.\n\n" + "لطفاً عبارت تابع را بررسی کنید.");

      return;
    }

    const trace = {
      x: xValues,

      y: yValues,

      mode: "lines",

      type: "scatter",

      connectgaps: false,

      name: label || expression,

      line: {
        width: 3,
      },

      hovertemplate:
        "x = %{x:.4f}<br>" + "y = %{y:.4f}" + "<extra>%{fullData.name}</extra>",
    };

    traces.push(trace);

    updateGraph();

    updateFunctionList();
  }

  // ---------------------------------------------------------
  // UPDATE GRAPH
  // ---------------------------------------------------------

  function updateGraph() {
    Plotly.react(graphElement, traces, graphLayout, graphConfig);
  }

  // ---------------------------------------------------------
  // UPDATE FUNCTION LIST
  // ---------------------------------------------------------

  function updateFunctionList() {
    functionList.innerHTML = "";

    if (traces.length === 0) {
      functionList.innerHTML = "<p>هنوز تابعی رسم نشده است.";

      return;
    }

    traces.forEach(function (trace, index) {
      const item = document.createElement("div");

      item.className = "function-item";

      item.innerHTML = `
          <span>
            <strong>${index + 1}.</strong>
            ${trace.name}
          </span>

          <button
            type="button"
            class="danger-btn remove-function"
            data-index="${index}"
          >
            حذف
          </button>
        `;

      functionList.appendChild(item);
    });

    const removeButtons = document.querySelectorAll(".remove-function");

    removeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const index = Number(this.dataset.index);

        traces.splice(index, 1);

        updateGraph();

        updateFunctionList();
      });
    });
  }

  // ---------------------------------------------------------
  // PLOT BUTTON
  // ---------------------------------------------------------

  plotBtn.addEventListener("click", function () {
    const expression = functionInput.value.trim();

    if (!expression) {
      alert("لطفاً تابع ریاضی را وارد کنید.");

      functionInput.focus();

      return;
    }

    plotFunction(expression);

    functionInput.value = "";

    functionInput.focus();
  });

  // ---------------------------------------------------------
  // ENTER KEY
  // ---------------------------------------------------------

  functionInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();

      plotBtn.click();
    }
  });

  // ---------------------------------------------------------
  // QUICK FUNCTIONS
  // ---------------------------------------------------------

  const quickFunctions = document.querySelectorAll(".quick-function");

  quickFunctions.forEach(function (button) {
    button.addEventListener("click", function () {
      const expression = this.dataset.function;

      functionInput.value = expression;

      functionInput.focus();
    });
  });

  // ---------------------------------------------------------
  // CLEAR ALL
  // ---------------------------------------------------------

  clearBtn.addEventListener("click", function () {
    traces = [];

    Plotly.react(graphElement, [], graphLayout, graphConfig);

    updateFunctionList();

    pointInfo.textContent =
      "برای مشاهده مختصات، نشانگر را روی نمودار حرکت دهید.";
  });

  // ---------------------------------------------------------
  // EXAMPLES
  // ---------------------------------------------------------

  examplesBtn.addEventListener("click", function () {
    const examples = [
      "sin(x)",
      "cos(x)",
      "x^2",
      "sqrt(abs(x))",
      "1/x",
      "sin(x)/x",
    ];

    const selected = examples[Math.floor(Math.random() * examples.length)];

    functionInput.value = selected;

    functionInput.focus();
  });

  // ---------------------------------------------------------
  // RESET ZOOM
  // ---------------------------------------------------------

  resetZoomBtn.addEventListener("click", function () {
    Plotly.relayout(graphElement, {
      "xaxis.autorange": true,
      "yaxis.autorange": true,
    });
  });

  // ---------------------------------------------------------
  // ZOOM IN
  // ---------------------------------------------------------

  zoomInBtn.addEventListener("click", function () {
    const xRange = graphElement.layout.xaxis.range;

    const yRange = graphElement.layout.yaxis.range;

    if (!xRange || !yRange) {
      return;
    }

    const xCenter = (xRange[0] + xRange[1]) / 2;

    const yCenter = (yRange[0] + yRange[1]) / 2;

    const xHalf = (xRange[1] - xRange[0]) * 0.4;

    const yHalf = (yRange[1] - yRange[0]) * 0.4;

    Plotly.relayout(graphElement, {
      "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

      "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
    });
  });

  // ---------------------------------------------------------
  // ZOOM OUT
  // ---------------------------------------------------------

  zoomOutBtn.addEventListener("click", function () {
    const xRange = graphElement.layout.xaxis.range;

    const yRange = graphElement.layout.yaxis.range;

    if (!xRange || !yRange) {
      return;
    }

    const xCenter = (xRange[0] + xRange[1]) / 2;

    const yCenter = (yRange[0] + yRange[1]) / 2;

    const xHalf = (xRange[1] - xRange[0]) * 0.625;

    const yHalf = (yRange[1] - yRange[0]) * 0.625;

    Plotly.relayout(graphElement, {
      "xaxis.range": [xCenter - xHalf, xCenter + xHalf],

      "yaxis.range": [yCenter - yHalf, yCenter + yHalf],
    });
  });

  // ---------------------------------------------------------
  // LINEAR FUNCTION PREVIEW
  // ---------------------------------------------------------

  function updateLinearPreview() {
    const a = Number(linearAInput.value) || 0;

    const b = Number(linearBInput.value) || 0;

    let equation = "";

    if (a === 0) {
      equation = `y = ${b}`;
    } else {
      equation = `y = ${a}x`;

      if (b > 0) {
        equation += ` + ${b}`;
      } else if (b < 0) {
        equation += ` - ${Math.abs(b)}`;
      }
    }

    linearPreview.textContent = equation;
  }

  linearAInput.addEventListener("input", updateLinearPreview);

  linearBInput.addEventListener("input", updateLinearPreview);

  // ---------------------------------------------------------
  // LINEAR EQUATION PARSER
  // ---------------------------------------------------------

  function parseLinearEquation(equation) {
    equation = equation.trim().toLowerCase().replace(/\s+/g, "");

    // حذف y=
    equation = equation.replace(/^y=/, "");

    // اگر x وجود نداشت
    if (!equation.includes("x")) {
      const constant = Number(equation);

      if (Number.isFinite(constant)) {
        return {
          a: 0,
          b: constant,
        };
      }

      return null;
    }

    // استفاده از Math.js
    // برای محاسبه مقدار تابع در x=0 و x=1
    try {
      const b = math.evaluate(equation, {
        x: 0,
      });

      const y1 = math.evaluate(equation, {
        x: 1,
      });

      const coefficient = y1 - b;

      if (Number.isFinite(coefficient) && Number.isFinite(b)) {
        return {
          a: coefficient,
          b: b,
        };
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  // ---------------------------------------------------------
  // PLOT LINEAR FUNCTION
  // ---------------------------------------------------------

  plotLinearBtn.addEventListener("click", function () {
    let a;
    let b;

    const directEquation = linearEquationInput.value.trim();

    if (directEquation) {
      const result = parseLinearEquation(directEquation);

      if (!result) {
        alert(
          "تابع درجه یک وارد شده معتبر نیست.\n\n" +
            "مثال صحیح:\n" +
            "y = 2x + 3",
        );

        return;
      }

      a = result.a;

      b = result.b;
    } else {
      a = Number(linearAInput.value);

      b = Number(linearBInput.value);

      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        alert("ضرایب a و b معتبر نیستند.");

        return;
      }
    }

    const expression = `${a} * x + (${b})`;

    const label = `y = ${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`;

    plotFunction(expression, label);
  });

  // ---------------------------------------------------------
  // GRAPH HOVER
  // ---------------------------------------------------------

  graphElement.on("plotly_hover", function (eventData) {
    if (!eventData || !eventData.points || !eventData.points.length) {
      return;
    }

    const point = eventData.points[0];

    const x = Number(point.x);

    const y = Number(point.y);

    pointInfo.innerHTML = `
        <strong>مختصات نقطه:</strong>

        <span dir="ltr">
          X = ${x.toFixed(6)}
          &nbsp;&nbsp;
          Y = ${y.toFixed(6)}
        </span>
      `;
  });

  // ---------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------

  updateLinearPreview();

  updateFunctionList();

  console.log("VAYRA Graph Engine Loaded Successfully");
});
