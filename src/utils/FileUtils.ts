class FileUtils {

  public static downloadBlob(blob: Blob, contentType: string, filename: string) {
    const pdfBlob = new Blob([blob], { type: contentType });
    const data = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    document.body.appendChild(link);
    link.href = data;
    link.download = filename;
    link.click();
    setTimeout(function () {
      window.URL.revokeObjectURL(data);
    }, 100);
  }

}

export default FileUtils;