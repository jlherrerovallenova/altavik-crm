// src/utils/feedbackTemplates.ts

export const getFeedbackEmailTemplate = (clientName: string, promotionName: string = "RESIDENCIAL ALTAVIK", leadId?: string, baseUrl?: string) => {
  const getFeedbackUrl = (rating: string) => {
    if (!baseUrl || !leadId) return '#';
    // Codificamos el nombre por si tiene espacios o caracteres especiales
    const encodedName = encodeURIComponent(clientName);
    return `${baseUrl}/feedback?leadId=${leadId}&rating=${rating}&name=${encodedName}`;
  };

  const firstName = clientName.split(' ')[0] || 'Cliente';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tu opinión sobre Residencial Altavik</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; color: #334155; margin: 0; padding: 0; }
      </style>
    </head>
    <body style="background-color: #f1f5f9; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
        
        <!-- Header Corporativo -->
        <div style="background-color: #ffffff; padding: 28px 20px; text-align: center; border-bottom: 2px solid #6b94b9;">
          <img src="https://oenaworwtrblkmjvwjfs.supabase.co/storage/v1/object/public/documents/logo-altavik.png" alt="Altavik Residencial" style="height: 60px; max-height: 60px; width: auto; display: inline-block; border: none; outline: none;" />
        </div>

        <!-- Contenido principal -->
        <div style="padding: 40px 35px; text-align: left;">
          <p style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 20px;">
            ¡Buenos días, ${firstName}!
          </p>
          
          <p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.8;">
            Hace unos días le enviamos la información detallada sobre nuestra promoción <strong style="color: #1e293b;">${promotionName}</strong>. Para nosotros es fundamental conocer si la propuesta se ajusta a sus expectativas o si hay algún aspecto en el que podamos mejorar nuestra atención.
          </p>
          
          <p style="font-size: 14px; color: #475569; margin-bottom: 35px; line-height: 1.8;">
            ¿Le gustaría dedicarnos menos de 30 segundos para responder a una breve encuesta de opinión? Sus respuestas son anónimas y nos ayudan a ofrecerle exactamente lo que busca.
          </p>
          
          <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
            <a href="${getFeedbackUrl('')}" style="background-color: #2563eb; color: #ffffff; padding: 15px 32px; border-radius: 12px; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; display: inline-block; text-decoration: none; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
              📝 COMENZAR ENCUESTA
            </a>
          </div>
        </div>

        <!-- Footer Legal -->
        <div style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
          <div style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
            &copy; ${new Date().getFullYear()} Altavik Real Estate S.L. <br>
            Has recibido este correo porque mostraste interés en una de nuestras promociones.
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
};
