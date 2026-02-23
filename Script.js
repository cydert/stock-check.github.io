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
    const companyId = document.getElementById("companyId").value;
    const jqCompanyName = document.getElementById("jqCompanyName").value;

    localStorage.setItem("eps", eps);
    localStorage.setItem("bps", bps);
    localStorage.setItem("price", price);
    localStorage.setItem("companyId", companyId);
    localStorage.setItem("jqCompanyName", jqCompanyName);
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
// 履歴（保存リスト）管理
// ==========================================
function getHistory() {
    const data = localStorage.getItem("stockHistory");
    return data ? JSON.parse(data) : [];
}

function setHistory(historyArray) {
    localStorage.setItem("stockHistory", JSON.stringify(historyArray));
}

function saveCurrentToHistory() {
    const companyId = document.getElementById("companyId").value.trim();
    const companyName = document.getElementById("jqCompanyName").value.trim();

    if (!companyId && !companyName) {
        if (!confirm("証券コードや会社名が未入力ですが、現在の状態を保存しますか？")) return;
    }

    const eps = getVal("eps");
    const bps = getVal("bps");
    const price = getVal("price");

    const now = new Date();
    const dateStr = now.toLocaleString("ja-JP", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    const newRecord = {
        id: Date.now().toString(),
        dateStr: dateStr,
        companyId: companyId,
        companyName: companyName,
        eps: eps,
        bps: bps,
        price: price
    };

    const history = getHistory();
    history.unshift(newRecord); // 最新を一番上に追加
    setHistory(history);
    renderHistory();
}

function deleteHistory(id, event) {
    if (event) event.stopPropagation(); // 行のクリック（読み込み）を防ぐ
    if (!confirm("この保存データを削除しますか？")) return;
    let history = getHistory();
    history = history.filter(item => item.id !== id);
    setHistory(history);
    renderHistory();
}

function loadFromHistory(id) {
    const history = getHistory();
    const record = history.find(item => item.id === id);
    if (!record) return;

    if (confirm("入力欄のデータをこの保存データで上書きしてよろしいですか？")) {
        document.getElementById("companyId").value = record.companyId || "";
        document.getElementById("jqCompanyName").value = record.companyName || "";
        setVal("eps", record.eps);
        setVal("bps", record.bps);
        setVal("price", record.price);

        calcIndicators();
        saveValues();
        drawGraph();

        // モバイルなどで使いやすいように一番上へスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderHistory() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;
    const history = getHistory();

    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.innerHTML = '<div class="p-4 text-muted small text-center">保存されたデータはありません。<br>「+ 現在を保存」ボタンで記録できます。</div>';
        return;
    }

    history.forEach(item => {
        const div = document.createElement("div");
        div.className = "list-group-item list-group-item-action d-flex flex-column gap-1";
        div.style.cursor = "pointer";
        div.onclick = () => loadFromHistory(item.id);

        const titleText = (item.companyId ? `<span class="badge bg-secondary me-1">${item.companyId}</span> ` : "")
            + `<span class="fw-bold">${item.companyName || "名称未設定"}</span>`;

        const priceText = item.price !== null ? `<span class="text-dark">株価: ${item.price.toLocaleString()}円</span>` : "<span>株価: -</span>";

        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="text-truncate me-2" style="max-width: 85%; font-size: 0.95rem;">
                    ${titleText}
                </div>
                <button class="btn btn-sm btn-outline-danger p-0 px-1 border-0" onclick="deleteHistory('${item.id}', event)" title="削除" style="font-size: 1.1rem; line-height: 1;">×</button>
            </div>
            <div class="d-flex justify-content-between align-items-end mt-1">
                <div class="small bg-light px-2 py-1 rounded border">${priceText}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${item.dateStr}</div>
            </div>
        `;
        historyList.appendChild(div);
    });
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

    // 証券コードだけ入力したときにも保存
    document.getElementById("companyId").addEventListener("input", saveValues);

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

    // 銘柄検索ボタン（SBI証券）
    const searchSbiBtn = document.getElementById("searchSbiBtn");
    if (searchSbiBtn) {
        searchSbiBtn.addEventListener("click", () => {
            const companyIdRaw = document.getElementById("companyId").value.trim();
            if (!companyIdRaw) {
                alert("証券コードを入力してください");
                return;
            }
            // 日本株は通常4桁（APIのときは5桁でしたが手動検索時は4桁ベースが多い）
            const code = companyIdRaw.slice(0, 4);
            const url = `https://site0.sbisec.co.jp/marble/domestic/top.do?s_rkbn=&otk=&sq=${code}`;
            window.open(url, '_blank');
        });
    }

    // 銘柄検索ボタン（Yahoo!ファイナンス）
    const searchYahooBtn = document.getElementById("searchYahooBtn");
    if (searchYahooBtn) {
        searchYahooBtn.addEventListener("click", () => {
            const companyIdRaw = document.getElementById("companyId").value.trim();
            if (!companyIdRaw) {
                alert("証券コードを入力してください");
                return;
            }
            const code = companyIdRaw.slice(0, 4);
            const url = `https://finance.yahoo.co.jp/quote/${code}.T`;
            window.open(url, '_blank');
        });
    }

    // 会社名(メモ)の入力時にも保存
    document.getElementById("jqCompanyName").addEventListener("input", saveValues);

    const saveBtn = document.getElementById("saveRecordBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveCurrentToHistory);
}

// ==========================================
// 初期化
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    addListeners();

    const eps = localStorage.getItem("eps");
    const bps = localStorage.getItem("bps");
    const price = localStorage.getItem("price");

    // 保存データの復元
    const companyId = localStorage.getItem("companyId");
    const jqCompanyName = localStorage.getItem("jqCompanyName");

    if (eps !== null && eps !== "") document.getElementById("eps").value = eps;
    if (bps !== null && bps !== "") document.getElementById("bps").value = bps;
    if (price !== null && price !== "") document.getElementById("price").value = price;

    if (companyId !== null && companyId !== "") document.getElementById("companyId").value = companyId;
    if (jqCompanyName !== null && jqCompanyName !== "") document.getElementById("jqCompanyName").value = jqCompanyName;

    if (eps || bps || price) {
        calcIndicators();
        drawGraph();
    }

    renderHistory();
});