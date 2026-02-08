// JavaScript source code
let chart = null;

document.getElementById("drawBtn").addEventListener("click", () => {
    const eps = Number(document.getElementById("eps").value);
    const bps = Number(document.getElementById("bps").value);
    const price = Number(document.getElementById("price").value);

    if (isNaN(eps) || isNaN(bps) || isNaN(price)) {
        alert("すべて数値を入力してください");
        return;
    }

    // ===== 指標計算 =====
    const per = eps !== 0 ? price / eps : null;
    const pbr = bps !== 0 ? price / bps : null;
    const roe = (eps !== 0 && bps !== 0) ? (eps / bps) * 100 : null;

    document.getElementById("per").textContent =
        per !== null ? per.toFixed(2) : "計算不可";

    document.getElementById("pbr").textContent =
        pbr !== null ? pbr.toFixed(2) : "計算不可";

    document.getElementById("roe").textContent =
        roe !== null ? roe.toFixed(2) : "計算不可";

    const ctx = document.getElementById("myChart").getContext("2d");

    // 既存グラフがあれば破棄
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["EPS", "BPS", "株価"],
            datasets: [
                {
                    label: "EPS / BPS",
                    data: [eps, bps, null],
                    yAxisID: "y",
                },
                {
                    label: "株価",
                    data: [null, null, price],
                    yAxisID: "y1",
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        text: "EPS/BPS"
                    }
                },
                y1: {
                    position: "right",
                    title: {
                        text: "株価"
                    }
                }
            }
        },
        plugins: [{
            id: "financialLines",
            afterDatasetsDraw(chart) {
                const { ctx } = chart;

                const metaValue = chart.getDatasetMeta(0); // EPS / BPS
                const metaPrice = chart.getDatasetMeta(1); // 株価

                const epsBar = metaValue.data[0];
                const bpsBar = metaValue.data[1];
                const priceBar = metaPrice.data[2];

                if (!epsBar || !bpsBar || !priceBar) return;

                ctx.save();
                ctx.font = "12px sans-serif";
                ctx.textAlign = "center";

                // ===== ROE（EPS ↔ BPS）=====
                if (roe !== null) {
                    drawLineWithLabel(
                        ctx,
                        epsBar.x, epsBar.y,
                        bpsBar.x, bpsBar.y,
                        `ROE ${roe.toFixed(1)}%`,
                        "rgba(0, 120, 255, 0.7)",
                        [],
                        roe >= 15 ? 4 : 2 // 太さ条件
                    );
                }

                // ===== PER（EPS ↔ 株価）=====
                if (per !== null) {
                    const perColor =
                        per >= 25
                            ? "rgba(200, 0, 0, 0.9)"   //PER 25超えて高すぎ
                            : "rgba(255, 80, 80, 0.6)";

                    drawLineWithLabel(
                        ctx,
                        epsBar.x, epsBar.y,
                        priceBar.x, priceBar.y,
                        `PER ${per.toFixed(1)}倍`,
                        perColor,
                        [6, 4], // 点線
                        2
                    );
                }

                // ===== PBR（BPS ↔ 株価）=====
                if (pbr !== null) {
                    const pbrColor =
                        pbr < 1
                            ? "rgba(0, 80, 200, 0.9)" //1倍割れ
                            : "rgba(0, 180, 120, 0.7)";
                    drawLineWithLabel(
                        ctx,
                        bpsBar.x, bpsBar.y,
                        priceBar.x, priceBar.y,
                        `PBR ${pbr.toFixed(1)}倍`,
                        pbrColor,
                        [2, 6], // 別パターン点線
                        2
                    );
                }

                ctx.restore();
            }
        }]

    });
});

function drawLineWithLabel(
    ctx,
    x1, y1,
    x2, y2,
    label,
    color,
    dash = [],
    lineWidth = 2
) {
    //線
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();

    // 注釈（中点）
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    ctx.fillStyle = color;
    ctx.fillText(label, midX, midY - 6);
}