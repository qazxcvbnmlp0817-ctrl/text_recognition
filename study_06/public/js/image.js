// 이미지 파일 읽기 → 긴 변 1024px로 축소 → JPEG data URL
const ImageTools = (function () {
  const MAX_SIDE = 1024;
  const QUALITY = 0.8;

  class ImageError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new ImageError("UNSUPPORTED", "이 형식은 지원하지 않아요. JPG나 PNG로 올려 주세요."));
      img.src = src;
    });
  }

  async function toResizedDataUrl(file, maxSide = MAX_SIDE, quality = QUALITY) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      throw new ImageError("NOT_IMAGE", "이미지 파일(JPG, PNG, WEBP)만 올릴 수 있어요.");
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // 투명 PNG를 JPEG로 바꿀 때 검게 나오지 않도록
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return { toResizedDataUrl, ImageError };
})();
