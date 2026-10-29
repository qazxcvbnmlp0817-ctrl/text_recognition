// 서버 /api 호출 (API 키는 서버에만 있고 브라우저는 모름)
const Api = (function () {
  class ApiError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }

  async function postJson(url, body, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === "AbortError") throw new ApiError("TIMEOUT", "응답이 늦어요. 다시 시도해 주세요.");
      throw new ApiError("NETWORK_ERROR", "서버에 연결하지 못했어요. 서버가 켜져 있는지 확인해 주세요.");
    } finally {
      clearTimeout(timer);
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const e = data && data.error;
      throw new ApiError(e ? e.code : "SERVER_ERROR", e ? e.message : "서버에서 오류가 났어요.");
    }
    return data;
  }

  // 서버 타임아웃(60초) + 429 재시도 대기 시간을 고려한 넉넉한 시간
  function recognize(imageDataUrl) {
    return postJson("/api/recognize", { image: imageDataUrl }, 140000);
  }

  // 레시피는 출력이 길어 서버 타임아웃이 90초 + 대체 모델·재시도 시간
  function recipes(body) {
    return postJson("/api/recipes", body, 240000);
  }

  return { recognize, recipes, ApiError };
})();
