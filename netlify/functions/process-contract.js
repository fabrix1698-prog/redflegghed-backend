const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
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

    const buffer = Buffer.from(fileBase64, 'base64');
    let extractedText = '';
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (lowerName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Formato non supportato. Carica un file PDF o DOCX.' })
      };
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Non è stato possibile leggere testo dal file caricato.' })
      };
    }

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content:
              'Sei un consulente esperto in contrattualistica. Analizza il contratto seguente e prepara una BOZZA di report che un revisore umano leggerà e correggerà prima di mandarla al cliente finale. Non è un parere legale definitivo: è materiale di lavoro interno.\n\n' +
              'Il report deve avere queste sezioni, in italiano semplice, senza legalese:\n' +
              '1. Struttura del contratto (tipo, parti coinvolte, oggetto principale)\n' +
              '2. Clausole a rischio, elencate in ordine di gravità\n' +
              '3. Spiegazione pratica di ogni rischio (cosa succede davvero se si applica)\n' +
              '4. Proposte di modifica per ogni punto critico (frasi pronte da negoziare)\n' +
              "5. Un verdetto di sintesi: firmabile così / firmabile con modifiche / sconsigliato\n\n" +
              `Note fornite dal cliente sulla propria situazione: ${customerNotes || 'nessuna nota fornita.'}\n\n` +
              `TESTO DEL CONTRATTO:\n${extractedText.substring(0, 15000)}`
          }
        ]
      })
    });

    const claudeData = await claudeResponse.json();

    if (!claudeResponse.ok) {
      console.error('Errore Claude API:', claudeData);
      return { statusCode: 502, body: JSON.stringify({ error: 'Errore nell\'analisi automatica del contratto.' }) };
    }

    const draftReport = (claudeData.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    await sgMail.send({
      to: process.env.OWNER_EMAIL,
      from: process.env.SENDER_EMAIL,
      subject: `Nuova bozza report — ${fileName}`,
      text:
        `Nuovo contratto ricevuto su Redflegghed.\n\n` +
        `File: ${fileName}\n` +
        `Email cliente: ${customerEmail || 'non fornita'}\n` +
        `Note cliente: ${customerNotes || 'nessuna'}\n\n` +
        `--- BOZZA REPORT (DA RIVEDERE PRIMA DI INVIARE AL CLIENTE) ---\n\n${draftReport}`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Contratto ricevuto. Riceverai il responso entro 24 ore.'
      })
    };
  } catch (error) {
    console.error('Errore process-contract:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Errore interno del server.' }) };
  }
};
