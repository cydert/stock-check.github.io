// JavaScript source code
let chart = null;

// ==========================================
// ユーティリティ関数
// ==========================================
function getVal(id) {
    const val = parseFloat(document.getElementById(id).value);
    return isNaN(val) ? null : val;
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (val !== null && !isNaN(val) && isFinite(val)) {
        // 小数点第2位までにするが、実数のまま渡すなら Number.isInteger などで調整
        // ここでは統一して toFixed(2) にする。ただし .00 のような末尾0は残る
        el.value = Number.isInteger(val) ? val : val.toFixed(2);
    } else {
        el.value = "";
    }
}

// ==========================================
// 計算ロジック
// ==========================================

// EPS, BPS, PriceをベースにROE, PER, PBRを計算
function calcIndicators() {
    const eps = getVal("eps");
    const bps = getVal("bps");
    const price = getVal("price");

    let per = null;
    let pbr = null;
    let roe = null;

    if (eps !== null && eps !== 0 && price !== null) per = price / eps;
    if (bps !== null && bps !== 0 && price !== null) pbr = price / bps;
    if (eps !== null && bps !== null && bps !== 0) roe = (eps / bps) * 100;

    setVal("per", per);
    setVal("pbr", pbr);
    setVal("roe", roe);
}

// ROEから逆算
function reverseCalcFromRoe() {
    const roe = getVal("roe");
    if (roe === null) return;
    
    const bps = getVal("bps");
    const eps = getVal("eps");

    if (bps !== null) {
        setVal("eps", bps * (roe / 100));
    } else if (eps !== null && roe !== 0) {
        setVal("bps", eps / (roe / 100));
    }
    calcIndicators(); // 整合性のため再計算
}

// PERから逆算
function reverseCalcFromPer() {
    const per = getVal("per");
    if (per === null) return;

    const eps = getVal("eps");
    const price = getVal("price");

    if (eps !== null) {
        setVal("price", eps * per);
    } else if (price !== null && per !== 0) {
        setVal("eps", price / per);
    }
    calcIndicators();
}

// PBRから逆算
function reverseCalcFromPbr() {
    const pbr = getVal("pbr");
    if (pbr === null) return;

    const bps = getVal("bps");
    const price = getVal("price");

    if (bps !== null) {
        setVal("price", bps * pbr);
    } else if (price !== null && pbr !== 0) {
        setVal("bps", price / pbr);
    }
    calcIndicators();
}

// ストレージ保存
function saveValues() {
    const eps = document.getElementById("eps").value;
    const bps = document.getElementById("bps").value;
    const price = document.getElementById("price").value;
    localStorage.setItem("eps", eps);
    localStorage.setItem("bps", bps);
    localStorage.setItem("price", price);
}

// ==========================================
// グラフ描画
// ==========================================
function drawGraph() {
    const eps = getVal("eps");
    const bps = getVal("bps");
    const price = getVal("price");
    
    if (eps === null && bps === null && price === null) return;

    const per = getVal("per");
    const pbr = getVal("pbr");
    const roe = getVal("roe");

    const ctx = document.getElementById("myChart").getContext("2d");

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["EPS", "BPS", "株価"],
            datasets: [
                {
                    label: "EPS / BPS / 株価",
                    data: [eps || 0, bps || 0, price || 0],
                    yAxisID: "y",
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        text: "EPS/BPS/株価"
                    }
                }
            }
        },
        plugins: [{
            id: "financialLines",
            afterDatasetsDraw(c) {
                const { ctx } = c;
                const metaValue = c.getDatasetMeta(0);

                const epsBar = metaValue.data[0];
                const bpsBar = metaValue.data[1];
                const priceBar = metaValue.data[2];

                if (!epsBar || !bpsBar || !priceBar) return;

                ctx.save();
                ctx.font = "12px sans-serif";
                ctx.textAlign = "center";

                if (roe !== null) {
                    drawLineWithLabel(
                        ctx,
                        epsBar.x, epsBar.y,
                        bpsBar.x, bpsBar.y,
                        `ROE ${roe.toFixed(1)}%`,
                        "rgba(0, 120, 255, 0.7)",
                        [],
                        roe >= 15 ? 4 : 2
                    );
                }

                if (per !== null) {
                    const perColor = per >= 25 ? "rgba(200, 0, 0, 0.9)" : "rgba(255, 80, 80, 0.6)";
                    drawLineWithLabel(
                        ctx,
                        epsBar.x, epsBar.y,
                        priceBar.x, priceBar.y,
                        `PER ${per.toFixed(1)}倍`,
                        perColor,
                        [6, 4],
                        2
                    );
                }

                if (pbr !== null) {
                    const pbrColor = pbr < 1 ? "rgba(0, 80, 200, 0.9)" : "rgba(0, 180, 120, 0.7)";
                    drawLineWithLabel(
                        ctx,
                        bpsBar.x, bpsBar.y,
                        priceBar.x, priceBar.y,
                        `PBR ${pbr.toFixed(1)}倍`,
                        pbrColor,
                        [2, 6],
                        2
                    );
                }

                ctx.restore();
            }
        }]
    });
}

function drawLineWithLabel(ctx, x1, y1, x2, y2, label, color, dash = [], lineWidth = 2) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.fillStyle = color;
    ctx.fillText(label, midX, midY - 6);
}

// ==========================================
// イベントリスナー
// ==========================================
function addListeners() {
    const updateFromBase = () => {
        calcIndicators();
        saveValues();
        drawGraph();
    };

    // EPS, BPS, 株価の入力時は通常計算
    document.getElementById("eps").addEventListener("input", updateFromBase);
    document.getElementById("bps").addEventListener("input", updateFromBase);
    document.getElementById("price").addEventListener("input", updateFromBase);

    // ROE, PER, PBRの変更時（フォーカスが外れた時等）は逆算
    document.getElementById("roe").addEventListener("change", () => { reverseCalcFromRoe(); saveValues(); drawGraph(); });
    document.getElementById("per").addEventListener("change", () => { reverseCalcFromPer(); saveValues(); drawGraph(); });
    document.getElementById("pbr").addEventListener("change", () => { reverseCalcFromPbr(); saveValues(); drawGraph(); });

    // 「表示」ボタン
    document.getElementById("drawBtn").addEventListener("click", () => {
        calcIndicators();
        saveValues();
        drawGraph();
    });
}

// ==========================================
// 初期化
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    addListeners();

    const eps = localStorage.getItem("eps");
    const bps = localStorage.getItem("bps");
    const price = localStorage.getItem("price");

    if (eps !== null && eps !== "") document.getElementById("eps").value = eps;
    if (bps !== null && bps !== "") document.getElementById("bps").value = bps;
    if (price !== null && price !== "") document.getElementById("price").value = price;

    if (eps || bps || price) {
        calcIndicators();
        drawGraph();
    }
});