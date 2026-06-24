/* ===========================================================================
   광고 성과 리포트 — 데이터 로더 / 렌더러
   구글 시트(site_data 탭, CSV 게시)에서 원본 수치를 읽어와
   파생 지표(ROAS, 총비용, 인당 비용 등)를 계산하고 화면에 채웁니다.
   원본 입력만 시트에서 관리하면 되고, 계산/표시는 모두 여기서 처리합니다.
   =========================================================================== */
(function () {
  "use strict";

  var CFG = window.DASHBOARD_CONFIG || {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 작은 CSV 파서 (따옴표 처리 포함) ---- */
  function parseCSV(text) {
    var rows = [], row = [], field = "", i = 0, inQ = false, c;
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    while (i < text.length) {
      c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQ = false;
        } else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
      i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* ---- key,value 형태의 CSV를 객체로 ---- */
  function toMap(rows) {
    var m = {};
    rows.forEach(function (r) {
      if (!r.length) return;
      var k = (r[0] || "").trim();
      if (!k || k.toLowerCase() === "key") return; // 헤더행 건너뜀
      m[k] = (r[1] != null ? String(r[1]).trim() : "");
    });
    return m;
  }

  /* ---- 헬퍼 ---- */
  function num(v) {
    if (v == null) return NaN;
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : NaN;
  }
  function fmt(n) { return isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—"; }
  function pct(x, dec) { return isFinite(x) ? (x * 100).toFixed(dec == null ? 0 : dec) + "%" : "—"; }
  function $(id) { return document.getElementById(id); }
  function setText(id, v) { var el = $(id); if (el) el.textContent = v; }
  function setWidth(id, p) { var el = $(id); if (el) el.style.width = Math.max(0, Math.min(100, p)) + "%"; }

  function animate(id, target) {
    var el = $(id);
    if (!el) return;
    if (reduce || !isFinite(target)) { el.textContent = fmt(target); return; }
    var dur = 900, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
    }
    requestAnimationFrame(step);
  }

  function daysBetween(a, b) {
    var d1 = new Date(a), d2 = new Date(b);
    if (isNaN(d1) || isNaN(d2)) return NaN;
    return Math.round((d2 - d1) / 86400000) + 1; // 양끝 포함
  }
  function fmtDate(s) {
    var d = new Date(s);
    if (isNaN(d)) return s || "—";
    var p = function (x) { return (x < 10 ? "0" : "") + x; };
    return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate());
  }

  /* ---- 렌더 ---- */
  function render(map) {
    var g = function (k) { return num(map[k]); };

    var adSpend = g("ad_spend");
    var pointsPaid = g("points_paid");
    var revenue = g("revenue");
    var impressions = g("impressions");
    var pageViews = g("page_views");
    var newConv = g("new_conversions");
    var totalPurch = g("total_purchases");
    var attributed = g("attributed");
    var shares = g("shares");
    var resultsTotal = g("results_total");
    var pph = g("point_per_head");

    var totalCost = adSpend + pointsPaid;
    var roasTotal = revenue / totalCost;          // 배수
    var roasAd = revenue / adSpend;
    var pointsHead = pph ? Math.round(pointsPaid / pph) : NaN;

    // 기간
    var start = map["period_start"], end = map["period_end"];
    var days = daysBetween(start, end);
    setText("period-range", fmtDate(start) + " – " + fmtDate(end).slice(5)); // 끝은 MM.DD
    setText("period-days", "집행 기간 " + (isFinite(days) ? days + "일" : "—"));

    // 히어로
    animate("roas-total", roasTotal * 100);
    setText("roas-ad", fmt(roasAd * 100));
    animate("total-cost", totalCost);
    setText("legend-ad", fmt(adSpend));
    setText("legend-pt", fmt(pointsPaid));
    animate("revenue", revenue);
    setText("roas-mult", isFinite(roasTotal) ? roasTotal.toFixed(1) : "—");
    setWidth("bar-ad", (adSpend / revenue) * 100);
    setWidth("bar-pt", (pointsPaid / revenue) * 100);

    // 비용 구성
    animate("ad-spend", adSpend);
    animate("points-paid", pointsPaid);
    setText("point-per-head", fmt(pph));
    setText("pph-2", fmt(pph));
    setText("points-head", fmt(pointsHead));
    animate("total-cost-2", totalCost);
    animate("cpa-total", totalCost / newConv);

    // 핵심 지표
    animate("impressions", impressions);
    animate("page-views", pageViews);
    setText("view-rate", pct(pageViews / impressions, 0));
    animate("new-conv", newConv);
    setText("conv-rate", pct(newConv / impressions, 2));
    animate("total-purchases", totalPurch);
    setText("purchase-rate", pct(totalPurch / impressions, 2));
    animate("cpp-ad", adSpend / totalPurch);
    setText("cpp-total", fmt(totalCost / totalPurch));
    animate("cpc-ad", adSpend / newConv);
    setText("cpc-total", fmt(totalCost / newConv));
    animate("attributed", attributed);
    animate("shares", shares);
    setText("results-total", fmt(resultsTotal));

    // 집행 전후 (선택) — 값이 있을 때만 표시
    var suBefore = g("signups_before"), suAfter = g("signups_after");
    var buBefore = g("buyers_before"), buAfter = g("buyers_after");
    if (isFinite(suBefore) || isFinite(buBefore)) {
      $("ba-section").style.display = "";
      renderBA("su", suBefore, suAfter, g("signups_attrib_total"), g("signups_attrib_daily"), days);
      renderBA("bu", buBefore, buAfter, g("buyers_attrib_total"), g("buyers_attrib_daily"), days);
    }

    // 각주
    setText("foot-line1",
      "ROAS는 거래액 ÷ 총비용(광고비+포인트 지급) 기준 " + fmt(roasTotal * 100) +
      "%입니다. 광고비만 기준으로는 " + fmt(roasAd * 100) + "%입니다.");
    setText("foot-line2",
      "신규 전환(" + fmt(newConv) + "명)은 메타 픽셀 집계 수치이고, 포인트 지급(" +
      fmt(pointsPaid) + "원)은 공유하기 등 간접 유입까지 포함해 약 " + fmt(pointsHead) + "명에게 지급됐습니다.");
    setText("foot-updated", "데이터 갱신: " + new Date().toLocaleString("ko-KR"));
  }

  function renderBA(prefix, before, after, attribTotal, attribDaily, days) {
    if (!isFinite(before) || !isFinite(after)) return;
    var lift = (after - before) / before;
    var mult = after / before;
    setText(prefix + "-lift", "+" + Math.round(lift * 100) + "% · 약 " + mult.toFixed(1) + "배");
    animate(prefix + "-before", before);
    animate(prefix + "-after", after);
    var max = Math.max(before, after);
    setWidth(prefix + "-bar-before", (before / max) * 100);
    setWidth(prefix + "-bar-after", (after / max) * 100);
    if (isFinite(attribTotal)) setText(prefix + "-attrib-total", fmt(attribTotal));
    // 일평균: 명시값(signups_attrib_daily 등)이 있으면 그대로, 없으면 총원/일수로 계산
    var daily = isFinite(attribDaily) ? attribDaily
      : (isFinite(attribTotal) && isFinite(days) && days ? attribTotal / days : NaN);
    setText(prefix + "-attrib-daily", fmt(daily));
  }

  /* ---- 응답이 JSON(웹앱) 이든 CSV(게시) 이든 모두 처리 ---- */
  function parseData_(text) {
    var t = (text || "").trim();
    if (t.charAt(0) === "{" || t.charAt(0) === "[") {
      try {
        var j = JSON.parse(t);
        if (Array.isArray(j)) {
          var m = {};
          j.forEach(function (o) { if (o && o.key != null) m[String(o.key).trim()] = o.value; });
          return m;
        }
        if (j && typeof j === "object") {
          var m2 = {};
          Object.keys(j).forEach(function (k) { m2[k.trim()] = j[k]; });
          return m2;
        }
      } catch (e) { /* JSON 아니면 CSV로 */ }
    }
    return toMap(parseCSV(text));
  }

  /* ---- 로드 ---- */
  function showError(msg) {
    var e = $("dash-error");
    if (e) { e.style.display = ""; e.innerHTML = msg; }
    var l = $("dash-loading"); if (l) l.style.display = "none";
  }

  function load() {
    if (!CFG.csvUrl || CFG.csvUrl.indexOf("PASTE_") === 0) {
      showError("⚠️ <code>assets/config.js</code> 의 <code>csvUrl</code> 에 구글 시트 게시 CSV 주소를 넣어주세요.");
      return;
    }
    var url = CFG.csvUrl + (CFG.csvUrl.indexOf("?") >= 0 ? "&" : "?") + "_cb=" + Date.now(); // 캐시 우회
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (text) {
        var map = parseData_(text);
        if (!Object.keys(map).length) throw new Error("빈 데이터");
        render(map);
        var l = $("dash-loading"); if (l) l.style.display = "none";
        var s = $("sheet"); if (s) s.setAttribute("data-loading", "false");
      })
      .catch(function (err) {
        showError("데이터를 불러오지 못했습니다: <code>" + (err && err.message ? err.message : err) +
          "</code><br>시트가 ‘웹에 게시’ 되었는지, CSV 주소가 맞는지 확인해주세요.");
        console.error(err);
      });
  }

  load();
  if (CFG.refreshMs && CFG.refreshMs > 0) setInterval(load, CFG.refreshMs);
})();
