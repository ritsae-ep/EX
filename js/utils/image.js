export function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas =
          document.createElement("canvas");

        const maxWidth = 480;

        const ratio =
          maxWidth / img.width;

        canvas.width = maxWidth;
        canvas.height =
          img.height * ratio;

        const ctx =
          canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const base64 =
          canvas.toDataURL(
            "image/jpeg",
            0.6
          );

        resolve(base64);
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}