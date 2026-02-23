export default {
    async fetch(request) {
        const allowedOrigin = "*";

        // CORSプリフライト対応
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(allowedOrigin)
            });
        }

        const origin = request.headers.get("Origin");
        if (origin !== allowedOrigin) {
            return new Response("Forbidden", { status: 403 });
        }

        const companyId = new URL(request.url).searchParams.get("code");
        if (!companyId) {
            return jsonResponse({ error: "証券コードが必要です" }, 400, allowedOrigin);
        }

        const apiKey = request.headers.get("X-API-KEY");
        if (!apiKey) {
            return jsonResponse({ error: "APIキーが必要です" }, 401, allowedOrigin);
        }

        try {
            const headers = { "x-api-key": apiKey };

            // レート制限（1秒あたりのリクエスト上限など）を考慮し順番に直列でfetchを行います。
            const companyName = await fetchCompanyName(companyId, headers);
            const { price, date } = await fetchLatestPrice(companyId, headers);
            const { eps, bps } = await fetchFinancials(companyId, headers);

            return jsonResponse({ companyName, price, date, eps, bps }, 200, allowedOrigin);

        } catch (err) {
            // カスタムエラー（ステータスコード付き）をハンドリング
            const status = err.status || 500;
            return jsonResponse({ error: err.message }, status, allowedOrigin);
        }
    }
};

// ==========================================
// APIフェッチ用ヘルパー関数
// ==========================================

async function fetchCompanyName(companyId, headers) {
    const res = await fetch(`https://api.jquants.com/v2/equities/master?code=${companyId}`, { headers });
    if (!res.ok) throw new ApiError("銘柄情報取得失敗", res.status);

    const data = await res.json();
    const infoArray = data.info || data.data || [];
    if (infoArray.length === 0) throw new ApiError("銘柄情報が見つかりません", 404);

    return infoArray[0].CoName;
}

async function fetchLatestPrice(companyId, headers) {
    // 直近30日間のデータを要求して、休場日(土日・長期連休)をカバーしつつ最新を取得する。
    const fromDateStr = getPastDateString(30);
    const res = await fetch(`https://api.jquants.com/v2/equities/bars/daily?code=${companyId}&from=${fromDateStr}`, { headers });
    if (!res.ok) throw new ApiError("株価取得失敗", res.status);

    const data = await res.json();
    const dailyQuotes = data.daily_quotes || data.data || [];
    if (dailyQuotes.length === 0) throw new ApiError("株価データなし", 404);

    // 日付で昇順にソートし、最新を末尾にする
    dailyQuotes.sort((a, b) => a.Date.localeCompare(b.Date));
    const latestQuote = dailyQuotes[dailyQuotes.length - 1];

    return {
        price: latestQuote.C,
        date: latestQuote.Date
    };
}

async function fetchFinancials(companyId, headers) {
    const res = await fetch(`https://api.jquants.com/v2/fins/summary?code=${companyId}`, { headers });
    if (!res.ok) throw new ApiError("財務情報取得失敗", res.status);

    const data = await res.json();
    const statements = data.statements || data.data || [];

    let eps = null;
    let bps = null;

    // 開示昇順なので後ろから最新のものを探す
    for (let i = statements.length - 1; i >= 0; i--) {
        const s = statements[i];

        // 連結(EPS/BPS) または 単体(NCEPS/NCBPS) の値を取得
        const tempEps = s.EPS || s.NCEPS;
        if (eps === null && tempEps) eps = parseFloat(tempEps);

        const tempBps = s.BPS || s.NCBPS;
        if (bps === null && tempBps) bps = parseFloat(tempBps);

        if (eps !== null && bps !== null) break;
    }

    return {
        eps: (!eps || isNaN(eps)) ? 0 : eps,
        bps: (!bps || isNaN(bps)) ? 0 : bps
    };
}

// ==========================================
// ユーティリティ関数
// ==========================================

function getPastDateString(daysAgo) {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

function corsHeaders(origin) {
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-API-KEY"
    };
}

function jsonResponse(data, status, origin) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin)
        }
    });
}