import pb from '../../../core/pocketbase';

export interface ContactInquiryPayload {
  nombre: string;
  email: string;
  telefono?: string;
  nivel: 'inicial' | 'primario';
  mensaje: string;
  _hp?: string;
}

export interface ContactInquiryResponse {
  ok: boolean;
  message: string;
}

export async function sendContactInquiry(payload: ContactInquiryPayload): Promise<ContactInquiryResponse> {
  const endpoint = `${pb.baseUrl}/api/cys/contacto`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.message || 'No se pudo enviar la consulta. Por favor, intentá nuevamente.';
    throw new Error(errorMessage);
  }

  return {
    ok: true,
    message: data?.message || 'Tu consulta ha sido enviada con éxito.',
  };
}
