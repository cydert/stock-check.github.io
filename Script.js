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
                        "rgba(0, 120, 255, 0.7)"
                    );
                }

                // ===== PER（EPS ↔ 株価）=====
                if (per !== null) {
                    drawLineWithLabel(
                        ctx,
                        epsBar.x, epsBar.y,
                        priceBar.x, priceBar.y,
                        `PER ${per.toFixed(1)}倍`,
                        "rgba(255, 80, 80, 0.7)",
                        [6, 4] // 点線
                    );
                }

                // ===== PBR（BPS ↔ 株価）=====
                if (pbr !== null) {
                    drawLineWithLabel(
                        ctx,
                        bpsBar.x, bpsBar.y,
                        priceBar.x, priceBar.y,
                        `PBR ${pbr.toFixed(1)}倍`,
                        "rgba(0, 180, 120, 0.7)",
                        [2, 6] // 別パターン点線
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
    dash = []
) {
    // 線
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 注釈（中点）
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    ctx.fillStyle = color;
    ctx.fillText(label, midX, midY - 6);
}