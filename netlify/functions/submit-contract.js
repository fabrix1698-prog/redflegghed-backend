const sgMail = require('@sendgrid/mail');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { fileBase64, fileName, customerEmail, customerNotes } = JSON.parse(event.body || '{}');

    if (!fileBase64 || !fileName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'File mancante.' }) };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const lowerName = fileName.toLowerCase();
    const mimeType = lowerName.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    await sgMail.send({
      to: process.env.OWNER_EMAIL,
      from: process.env.SENDER_EMAIL,
      subject: `Nuovo contratto ricevuto — ${fileName}`,
      text:
        `Nuovo contratto ricevuto su Redflegghed.\n\n` +
        `File: ${fileName}\n` +
        `Email cliente: ${customerEmail || 'non fornita'}\n` +
        `Note cliente: ${customerNotes || 'nessuna'}\n\n` +
        `Il contratto è allegato a questa email.`,
      attachments: [
        {
          content: fileBase64,
          filename: fileName,
          type: mimeType,
          disposition: 'attachment'
        }
      ]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Contratto ricevuto. Riceverai il responso entro 24 ore.'
      })
    };
  } catch (error) {
    console.error('Errore submit-contract:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Errore interno del server.' }) };
  }
};
