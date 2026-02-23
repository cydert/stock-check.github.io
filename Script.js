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
    const jqCompanyName = document.getElementById("jqCompanyName").textContent;
    const jqDate = document.getElementById("jqDate").textContent;

    localStorage.setItem("eps", eps);
    localStorage.setItem("bps", bps);
    localStorage.setItem("price", price);
    localStorage.setItem("companyId", companyId);
    localStorage.setItem("jqCompanyName", jqCompanyName);
    localStorage.setItem("jqDate", jqDate);
}

// ==========================================
// 認証ステータスバッジの更新
// ==========================================
function updateAuthStatus() {
    const apiKey = localStorage.getItem("jqApiKey");

    const statusBadge = document.getElementById("jqTokenStatus");
    const displayArea = document.getElementById("tokenDisplayArea");
    const logoutBtn = document.getElementById("jqLogoutBtn");
    const loginBtn = document.getElementById("jqLoginBtn");
    const apiKeyInput = document.getElementById("jqApiKeyInput");

    if (!statusBadge) return;

    if (apiKey) {
        statusBadge.textContent = "設定済み (有効)";
        statusBadge.classList.replace("bg-secondary", "bg-success");

        if (displayArea) displayArea.style.display = "block";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
        if (loginBtn) loginBtn.style.display = "none";

        // 入力欄を無効化
        if (apiKeyInput) apiKeyInput.disabled = true;

        const displayEl = document.getElementById("jqApiTokenDisplay");
        if (displayEl) displayEl.value = apiKey;
    } else {
        statusBadge.textContent = "未設定";
        statusBadge.classList.replace("bg-success", "bg-secondary");

        if (displayArea) displayArea.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (loginBtn) loginBtn.style.display = "block";

        if (apiKeyInput) apiKeyInput.disabled = false;

        const displayEl = document.getElementById("jqApiTokenDisplay");
        if (displayEl) displayEl.value = "";
    }
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

    // J-Quantsデータ取得ボタン
    document.getElementById("fetchJquantsBtn").addEventListener("click", async () => {
        const companyIdRaw = document.getElementById("companyId").value.trim();
        const apiKey = localStorage.getItem("jqApiKey");

        if (!companyIdRaw) {
            alert("証券コードを入力してください");
            return;
        }

        if (!apiKey) {
            alert("画面右上の「設定」から、J-QuantsのAPIキーを設定してください。");
            return;
        }

        // J-Quantsの仕様上、日本の証券コードは5桁（末尾0）が多いので4桁入力時は補完
        const companyId = companyIdRaw.length === 4 ? companyIdRaw + "0" : companyIdRaw;

        const fetchBtn = document.getElementById("fetchJquantsBtn");
        fetchBtn.disabled = true;
        fetchBtn.textContent = "データ取得中...";

        try {
            const headers = { "x-api-key": apiKey };

            // 1. 会社名 (equities/master)
            // 2. 株価四本値 (equities/bars/daily)
            // 3. 財務情報 (fins/statements)
            const [resMaster, resDaily, resFins] = await Promise.all([
                fetch(`https://api.jquants.com/v2/equities/master?code=${companyId}`, { headers }),
                fetch(`https://api.jquants.com/v2/equities/bars/daily?code=${companyId}`, { headers }),
                fetch(`https://api.jquants.com/v2/fins/statements?code=${companyId}`, { headers })
            ]);

            if (!resMaster.ok) throw new Error("銘柄情報の取得に失敗しました。APIキーまたは証券コード(4桁/5桁)を確認してください。");
            if (!resDaily.ok) throw new Error("株価データの取得に失敗しました。");
            if (!resFins.ok) throw new Error("財務情報の取得に失敗しました。");

            // --- 1. 会社情報の解析 ---
            const dataMaster = await resMaster.json();
            const infoArray = dataMaster.info || [];
            if (infoArray.length === 0) {
                throw new Error("該当する証券コードの銘柄情報が見つかりません。");
            }
            const companyName = infoArray[0].CompanyName;

            // --- 2. 株価データの解析 ---
            const dataDaily = await resDaily.json();
            const dailyQuotes = dataDaily.daily_quotes || [];
            if (dailyQuotes.length === 0) {
                throw new Error("株価データが見つかりません。休場日や上場廃止の可能性があります。");
            }
            const latestQuote = dailyQuotes[dailyQuotes.length - 1]; // 配列の末尾が最新
            const latestPrice = latestQuote.Close;
            const quoteDateStr = latestQuote.Date;

            // --- 3. 財務情報(EPS, BPS)の解析 ---
            const dataFins = await resFins.json();
            const statements = dataFins.statements || [];

            let eps = null;
            let bps = null;

            // 最新となる配列の後ろから、値が入っているものを探す
            for (let i = statements.length - 1; i >= 0; i--) {
                const s = statements[i];
                if (eps === null && s.EarningsPerShare && s.EarningsPerShare !== "") {
                    eps = parseFloat(s.EarningsPerShare);
                }
                if (bps === null && s.BookValuePerShare && s.BookValuePerShare !== "") {
                    bps = parseFloat(s.BookValuePerShare);
                }
                if (eps !== null && bps !== null) break;
            }

            if (eps === null || isNaN(eps)) eps = 0;
            if (bps === null || isNaN(bps)) bps = 0;

            // --- 画面へのセット ---
            document.getElementById("jqCompanyName").textContent = companyName;
            document.getElementById("jqDate").textContent = quoteDateStr;

            document.getElementById("eps").value = eps;
            document.getElementById("bps").value = bps;
            document.getElementById("price").value = latestPrice;

            // 更新処理をキック（状態の保存、指標の逆算、グラフ描画）
            updateFromBase();

        } catch (err) {
            alert(err.message);
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = "データを取得";
        }
    });

    // 設定モーダルの「APIキーを保存」ボタン
    const loginBtn = document.getElementById("jqLoginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const apiKeyEl = document.getElementById("jqApiKeyInput");
            const apiKey = apiKeyEl ? apiKeyEl.value.trim() : "";

            if (!apiKey) {
                alert("APIキーを入力してください");
                return;
            }

            // V2 は APIキーを localStorage に保存
            localStorage.setItem("jqApiKey", apiKey);

            alert("APIキーを保存しました！");

            if (apiKeyEl) apiKeyEl.value = "";
            updateAuthStatus();
        });
    }

    // ログアウト（トークン削除）ボタン
    const logoutBtn = document.getElementById("jqLogoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("保存されているAPIキーを削除しますか？")) {
                localStorage.removeItem("jqApiKey");

                const apiKeyEl = document.getElementById("jqApiKeyInput");
                if (apiKeyEl) apiKeyEl.value = "";

                updateAuthStatus();
                alert("削除しました。");
            }
        });
    }
}

// ==========================================
// 初期化
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    addListeners();

    // モーダル内の認証状態バッジなどを初期表示で反映
    updateAuthStatus();

    const eps = localStorage.getItem("eps");
    const bps = localStorage.getItem("bps");
    const price = localStorage.getItem("price");

    // J-Quants 関連の復元
    const companyId = localStorage.getItem("companyId");
    const jqCompanyName = localStorage.getItem("jqCompanyName");
    const jqDate = localStorage.getItem("jqDate");

    if (eps !== null && eps !== "") document.getElementById("eps").value = eps;
    if (bps !== null && bps !== "") document.getElementById("bps").value = bps;
    if (price !== null && price !== "") document.getElementById("price").value = price;

    if (companyId !== null && companyId !== "") document.getElementById("companyId").value = companyId;
    if (jqCompanyName !== null && jqCompanyName !== "") document.getElementById("jqCompanyName").textContent = jqCompanyName;
    if (jqDate !== null && jqDate !== "") document.getElementById("jqDate").textContent = jqDate;

    if (eps || bps || price) {
        calcIndicators();
        drawGraph();
    }
});