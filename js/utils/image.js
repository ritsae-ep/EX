export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");

        const maxWidth = 360;
        const ratio = maxWidth / img.width;

        canvas.width = maxWidth;
        canvas.height = img.height * ratio;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const base64 = canvas.toDataURL("image/jpeg", 0.45);

        // 대략 500KB 넘으면 차단
        if (base64.length > 500000) {
          reject(new Error("IMAGE_TOO_LARGE"));
          return;
        }

        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error("IMAGE_LOAD_FAILED"));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error("FILE_READ_FAILED"));
    };

    reader.readAsDataURL(file);
  });
}