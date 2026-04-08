// src/utils/feedbackTemplates.ts

export const getFeedbackEmailTemplate = (clientName: string, promotionName: string = "nuestra promoción") => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; mx-auto; background: #ffffff; border-radius: 24px; overflow: hidden; margin: 40px auto; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .header { background: #10b981; padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
        .content { padding: 40px; text-align: center; }
        .content p { font-size: 16px; color: #475569; margin-bottom: 30px; }
        .promotion-card { background: #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 40px; }
        .promotion-card h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 10px 0; }
        .promotion-card p { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
        .actions { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .btn { display: block; padding: 16px 24px; border-radius: 14px; text-decoration: none; font-weight: 700; font-size: 14px; transition: all 0.2s; }
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
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Hace unos días nos visitaste para conocer más detalles sobre nuestra promoción. Nos encantaría saber tu opinión personal para seguir mejorando y ayudarte en lo que necesites.</p>
          
          <div class="promotion-card">
            <h2>PROMOCIÓN VISITADA</h2>
            <p>${promotionName}</p>
          </div>

          <div class="actions">
            <a href="#" class="btn btn-primary">⭐ ME HA ENCANTADO</a>
            <a href="#" class="btn btn-secondary">🤔 TENGO DUDAS</a>
            <a href="#" class="btn btn-danger">❌ NO ES LO QUE BUSCABA</a>
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
