# Redflegghed — Deploy del backend (istruzioni vere)

## Perché non basta il drag & drop

Il drag & drop che hai usato finora funziona per HTML statico. Questa Netlify
Function usa librerie npm (pdf-parse, mammoth, @sendgrid/mail) che vanno
installate. Il modo affidabile per farlo è la **Netlify CLI**, non il
trascinamento nel browser.

Ci vogliono davvero 10-15 minuti, una sola volta. Dopo, ogni aggiornamento
futuro è di nuovo un comando solo.

## Passaggi

### 1. Installa Netlify CLI (una volta sola)

Sul tuo computer, apri il Terminale (Mac) o Prompt dei comandi (Windows) e scrivi:

```
npm install -g netlify-cli
```

Se non hai Node.js installato, scaricalo prima da nodejs.org (versione LTS).

### 2. Login

```
netlify login
```

Si apre il browser, fai login con lo stesso account che usi già su Netlify.

### 3. Vai nella cartella del progetto

Estrai lo ZIP che ti ho dato, poi nel terminale:

```
cd percorso/della/cartella/redflegghed-backend
```

### 4. Installa le dipendenze

```
npm install
```

### 5. Collega la cartella al sito Redflegghed esistente

```
netlify link
```

Ti chiederà di scegliere il sito — seleziona quello che hai già (quello con
dominio redflegghed.com collegato).

### 6. Imposta le variabili d'ambiente (le tue API key)

**Non vanno mai scritte dentro il codice.** Vanno messe come variabili
d'ambiente su Netlify, così restano private. Da terminale:

```
netlify env:set ANTHROPIC_API_KEY "la-tua-chiave-claude"
netlify env:set SENDGRID_API_KEY "la-tua-chiave-sendgrid"
netlify env:set OWNER_EMAIL "fa-brix@live.it"
netlify env:set SENDER_EMAIL "fa-brix@live.it"
```

(Per SENDER_EMAIL usa lo stesso indirizzo che hai verificato su SendGrid —
mi hai detto che hai impostato fa-brix@live.it come mittente, quindi va bene
lo stesso indirizzo lì.)

### 7. Deploy

```
netlify deploy --prod
```

Aspetta che finisca — ti darà l'URL live. Fatto, il sistema è online.

## Importante — sicurezza da sistemare SUBITO

Nella nostra chat mi hai incollato in chiaro:
- La password del tuo account Netlify
- La API key di Claude
- La API key di SendGrid

Queste chiavi vanno considerate compromesse per il solo fatto di essere state
scritte in una chat. Prima di lanciare il servizio:

1. **Cambia subito la password di Netlify** (Account settings → Password).
2. **Rigenera la API key di Claude** su console.anthropic.com/account/keys —
   elimina quella vecchia, creane una nuova, usa quella nel comando `netlify
   env:set` sopra.
3. **Rigenera la API key di SendGrid** allo stesso modo (Settings → API Keys
   → elimina la vecchia, crea una nuova).

Questo non è opzionale: sono credenziali che danno accesso a soldi
(pagamenti indiretti, invio email a tuo nome) e a un servizio a pagamento.

## Come funziona una volta live

1. Il cliente paga su PayPal (come già succede).
2. Torna sul sito e usa il form "Carica il contratto" (nuovo).
3. Il file va alla Function, che estrae il testo ed chiama Claude per una
   **bozza** di analisi.
4. Tu ricevi una email a fa-brix@live.it con quella bozza.
5. **Tu la rileggi, correggi, integri con il tuo giudizio professionale**, e
   la mandi al cliente.

Il punto 5 resta manuale di proposito: la bozza automatica non sostituisce
la tua revisione — è materiale di lavoro, non il prodotto finale. Mandare al
cliente l'output grezzo dell'AI senza controllo espone te (è la tua P.IVA,
la tua responsabilità) a errori che un modello può commettere.

## Limiti da sapere

- File fino a 8MB (limite impostato nel form; i piani gratuiti di Netlify
  Functions hanno comunque un tetto di dimensione del payload).
- Solo PDF e DOCX sono supportati.
- Se il PDF è una scansione (immagine, non testo selezionabile), l'estrazione
  del testo fallisce — in quel caso serve OCR, che non è incluso qui.
