```javascript
/* =========================================
   VAYRA Advanced / Engineering Calculator
   ========================================= */

let currentInput = "0";
let previousInput = null;
let operator = null;
let waitingForOperand = false;

// حالت زاویه: DEG یا RAD
let angleMode = "DEG";

// گرفتن المان‌های صفحه
const display = document.querySelector("input");

// نمایش مقدار روی صفحه
function updateDisplay() {
    if (display) {
        display.value = currentInput;
    }
}

// پاک کردن کامل ماشین حساب
function clearCalculator() {
    currentInput = "0";
    previousInput = null;
    operator = null;
    waitingForOperand = false;
    updateDisplay();
}

// حذف آخرین رقم
function backspace() {
    if (currentInput.length <= 1 || currentInput === "Error") {
        currentInput = "0";
    } else {
        currentInput = currentInput.slice(0, -1);
    }

    updateDisplay();
}

// وارد کردن عدد
function inputNumber(number) {
    if (currentInput === "Error" || waitingForOperand) {
        currentInput = String(number);
        waitingForOperand = false;
    } else if (currentInput === "0") {
        currentInput = String(number);
    } else {
        currentInput += String(number);
    }

    updateDisplay();
}

// وارد کردن اعشار
function inputDecimal() {
    if (currentInput === "Error" || waitingForOperand) {
        currentInput = "0.";
        waitingForOperand = false;
    } else if (!currentInput.includes(".")) {
        currentInput += ".";
    }

    updateDisplay();
}

// تبدیل زاویه به رادیان
function toRadians(value) {
    return angleMode === "DEG"
        ? value * Math.PI / 180
        : value;
}

// تبدیل رادیان به درجه
function toDegrees(value) {
    return value * 180 / Math.PI;
}

// محاسبه فاکتوریل
function factorial(n) {
    if (!Number.isFinite(n)) {
        throw new Error("Invalid number");
    }

    if (n < 0 || !Number.isInteger(n)) {
        throw new Error("Factorial requires a non-negative integer");
    }

    if (n > 170) {
        throw new Error("Number too large");
    }

    let result = 1;

    for (let i = 2; i <= n; i++) {
        result *= i;
    }

    return result;
}

// اجرای تابع تک‌ورودی
function calculateFunction(func) {
    let value = parseFloat(currentInput);

    if (isNaN(value)) {
        currentInput = "Error";
        updateDisplay();
        return;
    }

    try {
        let result;

        switch (func) {

            // توابع مثلثاتی
            case "sin":
                result = Math.sin(toRadians(value));
                break;

            case "cos":
                result = Math.cos(toRadians(value));
                break;

            case "tan":
                result = Math.tan(toRadians(value));
                break;

            // لگاریتم پایه 10
            case "log":
                if (value <= 0) throw new Error();
                result = Math.log10(value);
                break;

            // لگاریتم طبیعی
            case "ln":
                if (value <= 0) throw new Error();
                result = Math.log(value);
                break;

            // ریشه دوم
            case "sqrt":
                if (value < 0) throw new Error();
                result = Math.sqrt(value);
                break;

            // توان دوم
            case "square":
                result = Math.pow(value, 2);
                break;

            // توان سوم
            case "cube":
                result = Math.pow(value, 3);
                break;

            // فاکتوریل
            case "factorial":
                result = factorial(value);
                break;

            // معکوس
            case "inverse":
                if (value === 0) throw new Error();
                result = 1 / value;
                break;

            // قدر مطلق
            case "absolute":
                result = Math.abs(value);
                break;

            default:
                return;
        }

        currentInput = formatResult(result);
        waitingForOperand = true;
        updateDisplay();

    } catch (error) {
        currentInput = "Error";
        waitingForOperand = true;
        updateDisplay();
    }
}

// فرمت کردن نتیجه
function formatResult(value) {

    if (!Number.isFinite(value)) {
        return "Error";
    }

    // حذف خطاهای بسیار کوچک اعشاری
    if (Math.abs(value) < 1e-12) {
        value = 0;
    }

    // اگر عدد خیلی بزرگ یا خیلی کوچک باشد
    if (
        Math.abs(value) >= 1e12 ||
        (Math.abs(value) > 0 && Math.abs(value) < 1e-10)
    ) {
        return value.toExponential(10);
    }

    return Number(value.toPrecision(12)).toString();
}

// انتخاب عملگر
function chooseOperator(nextOperator) {

    const inputValue = parseFloat(currentInput);

    if (isNaN(inputValue)) {
        return;
    }

    if (operator && previousInput !== null && !waitingForOperand) {
        calculate();
    }

    previousInput = parseFloat(currentInput);
    operator = nextOperator;
    waitingForOperand = true;
}

// انجام محاسبه
function calculate() {

    if (
        operator === null ||
        previousInput === null
    ) {
        return;
    }

    const currentValue = parseFloat(currentInput);

    if (isNaN(currentValue)) {
        currentInput = "Error";
        updateDisplay();
        return;
    }

    let result;

    try {

        switch (operator) {

            case "+":
                result = previousInput + currentValue;
                break;

            case "-":
                result = previousInput - currentValue;
                break;

            case "*":
                result = previousInput * currentValue;
                break;

            case "/":
                if (currentValue === 0) {
                    throw new Error();
                }

                result = previousInput / currentValue;
                break;

            default:
                return;
        }

        currentInput = formatResult(result);

    } catch (error) {
        currentInput = "Error";
    }

    previousInput = null;
    operator = null;
    waitingForOperand = true;

    updateDisplay();
}

// تغییر حالت DEG / RAD
function toggleAngleMode() {

    angleMode = angleMode === "DEG"
        ? "RAD"
        : "DEG";

    const angleButton = document.querySelector(
        "#angleMode, .angle-mode, [data-angle-mode]"
    );

    if (angleButton) {
        angleButton.textContent = angleMode;
    }
}

// افزودن π
function insertPi() {

    if (waitingForOperand || currentInput === "0") {
        currentInput = Math.PI.toString();
        waitingForOperand = false;
    } else {
        currentInput += Math.PI.toString();
    }

    updateDisplay();
}

// افزودن e
function insertE() {

    if (waitingForOperand || currentInput === "0") {
        currentInput = Math.E.toString();
        waitingForOperand = false;
    } else {
        currentInput += Math.E.toString();
    }

    updateDisplay();
}


/* =========================================
   اتصال خودکار دکمه‌ها
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {

    updateDisplay();

    // دکمه‌های عددی
    document.querySelectorAll("button").forEach(button => {

        const text = button.textContent.trim();

        // اعداد 0 تا 9
        if (/^[0-9]$/.test(text)) {
            button.addEventListener("click", () => {
                inputNumber(text);
            });
        }

        // اعشار
        else if (text === ".") {
            button.addEventListener("click", inputDecimal);
        }

        // جمع
        else if (text === "+") {
            button.addEventListener("click", () => {
                chooseOperator("+");
            });
        }

        // تفریق
        else if (text === "−" || text === "-") {
            button.addEventListener("click", () => {
                chooseOperator("-");
            });
        }

        // ضرب
        else if (text === "×" || text === "*") {
            button.addEventListener("click", () => {
                chooseOperator("*");
            });
        }

        // تقسیم
        else if (text === "÷" || text === "/") {
            button.addEventListener("click", () => {
                chooseOperator("/");
            });
        }

        // مساوی
        else if (text === "=") {
            button.addEventListener("click", calculate);
        }

        // پاک کردن
        else if (
            text === "پاک کردن" ||
            text === "C" ||
            text === "AC"
        ) {
            button.addEventListener("click", clearCalculator);
        }

        // حذف
        else if (
            text === "⌫" ||
            text.toLowerCase() === "backspace"
        ) {
            button.addEventListener("click", backspace);
        }

        // سینوس
        else if (text === "sin") {
            button.addEventListener("click", () => {
                calculateFunction("sin");
            });
        }

        // کسینوس
        else if (text === "cos") {
            button.addEventListener("click", () => {
                calculateFunction("cos");
            });
        }

        // تانژانت
        else if (text === "tan") {
            button.addEventListener("click", () => {
                calculateFunction("tan");
            });
        }

        // لگاریتم پایه 10
        else if (text === "log") {
            button.addEventListener("click", () => {
                calculateFunction("log");
            });
        }

        // لگاریتم طبیعی
        else if (text === "ln") {
            button.addEventListener("click", () => {
                calculateFunction("ln");
            });
        }

        // ریشه
        else if (text === "√") {
            button.addEventListener("click", () => {
                calculateFunction("sqrt");
            });
        }

        // توان دوم
        else if (text === "x²") {
            button.addEventListener("click", () => {
                calculateFunction("square");
            });
        }

        // توان سوم
        else if (text === "x³") {
            button.addEventListener("click", () => {
                calculateFunction("cube");
            });
        }

        // فاکتوریل
        else if (text === "x!") {
            button.addEventListener("click", () => {
                calculateFunction("factorial");
            });
        }

        // عدد پی
        else if (text === "π") {
            button.addEventListener("click", insertPi);
        }

        // عدد e
        else if (text === "e") {
            button.addEventListener("click", insertE);
        }

        // معکوس
        else if (text === "1/x") {
            button.addEventListener("click", () => {
                calculateFunction("inverse");
            });
        }

        // قدر مطلق
        else if (text === "|x|") {
            button.addEventListener("click", () => {
                calculateFunction("absolute");
            });
        }

        // حالت DEG / RAD
        else if (
            text === "DEG" ||
            text === "RAD"
        ) {
            button.addEventListener("click", toggleAngleMode);
        }

    });

});


/* =========================================
   پشتیبانی از کیبورد
   ========================================= */

document.addEventListener("keydown", function (event) {

    const key = event.key;

    // اعداد
    if (/^[0-9]$/.test(key)) {
        inputNumber(key);
        return;
    }

    // اعشار
    if (key === ".") {
        inputDecimal();
        return;
    }

    // عملیات
    if (key === "+") {
        chooseOperator("+");
        return;
    }

    if (key === "-") {
        chooseOperator("-");
        return;
    }

    if (key === "*") {
        chooseOperator("*");
        return;
    }

    if (key === "/") {
        event.preventDefault();
        chooseOperator("/");
        return;
    }

    // مساوی
    if (key === "Enter" || key === "=") {
        calculate();
        return;
    }

    // پاک کردن
    if (key === "Escape") {
        clearCalculator();
        return;
    }

    // حذف
    if (key === "Backspace") {
        backspace();
        return;
    }

});
```
