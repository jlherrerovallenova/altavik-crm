const SIGNWELL_API_URL = 'https://www.signwell.com/api/v1';

export async function sendDocumentToSignWell(
  file: Blob | File,
  fileName: string,
  signerName: string,
  signerEmail: string,
  message: string = 'Por favor, revise y firme el documento adjunto.'
) {
  const apiKey = import.meta.env.VITE_SIGNWELL_API_KEY;
  if (!apiKey) {
    throw new Error('API Key de SignWell no configurada en las variables de entorno.');
  }

  const base64File = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const payload = {
    test_mode: true, // Modo de pruebas por defecto para no gastar firmas
    draft: false, // Enviar automáticamente
    name: fileName,
    message: message,
    reminders: true,
    apply_signing_logic: false, // Desactivado para evitar el error de with_no_fields si el PDF no tiene etiquetas
    files: [
      {
        name: fileName,
        file_base64: base64File
      }
    ],
    recipients: [
      {
        id: "1",
        name: signerName,
        email: signerEmail,
        message: message
      }
    ],
    fields: [
      [
        {
          x: 100,
          y: 100,
          page: 1,
          recipient_id: "1",
          type: "signature",
          required: true
        }
      ]
    ]
  };

  const response = await fetch(`${SIGNWELL_API_URL}/documents`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error en SignWell: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data;
}

export async function getSignWellDocument(documentId: string) {
  const apiKey = import.meta.env.VITE_SIGNWELL_API_KEY;
  if (!apiKey) {
    throw new Error('API Key de SignWell no configurada.');
  }

  const response = await fetch(`${SIGNWELL_API_URL}/documents/${documentId}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Error obteniendo documento de SignWell: ${response.status}`);
  }

  return await response.json();
}
