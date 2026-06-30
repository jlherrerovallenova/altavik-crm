// src/utils/feedbackTemplates.ts

export const getFeedbackEmailTemplate = (clientName: string, promotionName: string = "nuestra promoción", leadId?: string, baseUrl?: string) => {
  const getFeedbackUrl = (rating: string) => {
    if (!baseUrl || !leadId) return '#';
    // Codificamos el nombre por si tiene espacios o caracteres especiales
    const encodedName = encodeURIComponent(clientName);
    return `${baseUrl}/feedback?leadId=${leadId}&rating=${rating}&name=${encodedName}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .header { background: #10b981; padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase; }
        .content { padding: 40px; text-align: center; }
        .content p { font-size: 16px; color: #475569; margin-bottom: 30px; }
        .promotion-card { background: #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 40px; }
        .promotion-card h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 10px 0; }
        .promotion-card p { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
        .actions { display: block; }
        .btn { display: block; padding: 16px 24px; border-radius: 14px; text-decoration: none; font-weight: 700; font-size: 14px; margin-bottom: 12px; text-align: center; }
        .btn-primary { background: #10b981; color: #ffffff; }
        .btn-secondary { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        .btn-danger { background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ALTAVIK • TERRAVALL</h1>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${clientName}</strong>,</p>
          <p>Hace unos días le enviamos la información detallada sobre nuestra promoción <strong>${promotionName}</strong>. Para nosotros es fundamental conocer si la propuesta se ajusta a sus expectativas o si hay algún aspecto en el que podamos mejorar nuestra atención.</p>
          <p>¿Le gustaría dedicarnos menos de 30 segundos para responder a una breve encuesta de opinión? Sus respuestas son anónimas y nos ayudan a ofrecerle exactamente lo que busca.</p>
          
          <div class="actions" style="margin-top: 40px;">
            <a href="${getFeedbackUrl('')}" class="btn btn-primary" style="font-size: 16px; padding: 18px 32px;">📝 COMENZAR ENCUESTA</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Altavik Real Estate S.L. <br>
          Has recibido este correo porque mostraste interés en una de nuestras promociones.
        </div>
      </div>
    </body>
    </html>
  `;
};
