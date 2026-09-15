const form = document.getElementById("form");
const input = document.getElementById("file");
const button = document.getElementById("submit");
const status = document.getElementById("status");
const message = document.getElementById("message");
const download = document.getElementById("download");

async function pedirUrl(file) {
  const response = await fetch("/v1/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Não foi possível preparar o upload: HTTP ${response.status}`,
    );
  }

  return response.json();
}

async function enviarArquivo(url, file) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Não foi possível enviar ao S3: HTTP ${response.status}`);
  }
}

async function aguardarConfirmacao(id) {
  // O evento do S3 confirma o upload. Aqui apenas consultamos a API a cada 2s.
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(`/v1/uploads/${id}`);

    if (!response.ok) {
      throw new Error(
        `Não foi possível consultar o upload: HTTP ${response.status}`,
      );
    }

    const upload = await response.json();
    if (upload.status !== "PENDING") return upload;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = input.files[0];
  if (!file || button.disabled) return;

  button.disabled = true;
  download.hidden = true;
  download.removeAttribute("href");
  status.textContent = "—";
  status.className = "badge";

  try {
    message.textContent = "Preparando upload...";
    const upload = await pedirUrl(file);

    status.textContent = "PENDING";
    status.className = "badge pending";
    message.textContent = "Enviando arquivo ao S3...";
    await enviarArquivo(upload.uploadUrl, file);

    message.textContent = "Arquivo enviado. Aguardando confirmação...";
    const resultado = await aguardarConfirmacao(upload.id);
    status.textContent = resultado.status;
    status.className = `badge ${resultado.status.toLowerCase()}`;
    message.textContent =
      resultado.status === "COMPLETED"
        ? "Upload confirmado!"
        : `Upload encerrado: ${resultado.status}`;

    if (resultado.downloadUrl) {
      download.href = resultado.downloadUrl;
      download.hidden = false;
    }
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
