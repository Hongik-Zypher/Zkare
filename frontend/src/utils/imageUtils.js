/**
 * 이미지 처리 유틸리티 함수
 */

/**
 * 파일을 Base64 문자열로 변환
 * @param {File} file - 변환할 파일
 * @returns {Promise<string>} Base64 문자열
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // data:image/jpeg;base64, 부분을 제거하고 순수 Base64만 반환
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * 이미지 파일 유효성 검증
 * @param {File} file - 검증할 파일
 * @returns {boolean} 유효성 여부
 */
export const validateImageFile = (file) => {
  // 파일 타입 확인
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!validTypes.includes(file.type)) {
    return false;
  }

  // 파일 크기 확인 (10MB 제한)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return false;
  }

  return true;
};

/**
 * 이미지 압축 (선택사항 - 필요시 사용)
 * @param {File} file - 압축할 이미지 파일
 * @param {number} maxWidth - 최대 너비
 * @param {number} maxHeight - 최대 높이
 * @param {number} quality - 품질 (0-1)
 * @returns {Promise<File>} 압축된 파일
 */
export const compressImage = async (
  file,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8
) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // 비율 유지하면서 크기 조정
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("이미지 압축 실패"));
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Base64 문자열을 Blob으로 변환
 * @param {string} base64 - Base64 문자열
 * @param {string} mimeType - MIME 타입
 * @returns {Blob} Blob 객체
 */
export const base64ToBlob = (base64, mimeType = "image/jpeg") => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Base64 문자열을 이미지 URL로 변환
 * @param {string} base64 - Base64 문자열
 * @param {string} mimeType - MIME 타입
 * @returns {string} Data URL
 */
export const base64ToDataURL = (base64, mimeType = "image/jpeg") => {
  return `data:${mimeType};base64,${base64}`;
};
