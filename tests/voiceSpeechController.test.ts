import assert from 'node:assert/strict';
import {
  DEFAULT_SILENCE_TIMEOUT_MS,
  SpeechResultLike,
  SpeechSubmitReason,
  VoiceTurnController,
  extractInstanceTranscript,
  mergeTranscriptWithoutDuplicates,
} from '../src/shared/voiceSpeechController';

class FakeClock {
  public now = 0;
  private nextId = 1;
  private timers = new Map<number, { runAt: number; cb: () => void }>();

  public setTimeout = (cb: () => void, ms: number): number => {
    const id = this.nextId++;
    this.timers.set(id, { runAt: this.now + ms, cb });
    return id;
  };

  public clearTimeout = (id: number): void => {
    this.timers.delete(id);
  };

  public nowFn = (): number => this.now;

  public advanceBy(ms: number): void {
    const target = this.now + ms;
    while (true) {
      let earliestId: number | null = null;
      let earliestRunAt = Infinity;
      for (const [id, entry] of this.timers.entries()) {
        if (entry.runAt <= target && entry.runAt < earliestRunAt) {
          earliestRunAt = entry.runAt;
          earliestId = id;
        }
      }
      if (earliestId === null) break;
      const entry = this.timers.get(earliestId)!;
      this.timers.delete(earliestId);
      this.now = entry.runAt;
      entry.cb();
    }
    this.now = target;
  }
}

function makeResults(items: Array<{ text: string; isFinal: boolean }>): SpeechResultLike[] {
  return items.map((item) => ({
    isFinal: item.isFinal,
    0: { transcript: item.text },
  }));
}

function createHarness(manualStopOnly: boolean, silenceTimeoutMs = DEFAULT_SILENCE_TIMEOUT_MS) {
  const clock = new FakeClock();
  const submitted: Array<{ text: string; reason: SpeechSubmitReason; atMs: number }> = [];
  const transcriptUpdates: string[] = [];
  const fatalErrors: Array<{ message: string; preserved: string }> = [];
  let autoRestarts = 0;
  let maxDurationEmptyCount = 0;

  const controller = new VoiceTurnController({
    manualStopOnly,
    silenceTimeoutMs,
    restartDelayMs: 150,
    maxNetworkRetries: 3,
    setTimeoutFn: clock.setTimeout,
    clearTimeoutFn: clock.clearTimeout,
    nowFn: clock.nowFn,
    onTranscriptChange: (text) => transcriptUpdates.push(text),
    onSubmitTranscript: (text, reason) =>
      submitted.push({ text, reason, atMs: clock.now }),
    onAutoRestartRequested: () => {
      autoRestarts += 1;
    },
    onMaxDurationEmpty: () => {
      maxDurationEmptyCount += 1;
    },
    onFatalError: (message, preserved) => {
      fatalErrors.push({ message, preserved });
    },
  });

  return {
    clock,
    controller,
    submitted,
    transcriptUpdates,
    fatalErrors,
    getAutoRestarts: () => autoRestarts,
    getMaxDurationEmptyCount: () => maxDurationEmptyCount,
  };
}

// =========================================================================
// MODE MANUEL : premier clic écoute, accumulation continue, deuxième clic envoie
// =========================================================================

// Test 1: Mode manuel — pauses longues (15s + 15s) sans jamais envoyer automatiquement
{
  const h = createHarness(true);
  h.controller.startTurn();
  h.controller.handleRecognitionResults(
    makeResults([{ text: 'Première phrase avant une longue pause.', isFinal: true }])
  );

  h.clock.advanceBy(15_000);
  h.controller.handleRecognitionEnd();
  h.clock.advanceBy(15_000);
  assert.equal(h.submitted.length, 0, 'Mode manuel ne doit jamais soumettre automatiquement');
  assert.ok(h.getAutoRestarts() >= 1, "Doit relancer l'écoute après interruption");

  h.controller.handleRecognitionResults(
    makeResults([{ text: 'Deuxième phrase après réflexion.', isFinal: false }])
  );
  assert.equal(h.submitted.length, 0);

  const sent = h.controller.manualStop();
  assert.equal(sent, true);
  assert.equal(h.submitted.length, 1);
  assert.equal(h.submitted[0].reason, 'manual_stop');
  assert.equal(
    h.submitted[0].text,
    'Première phrase avant une longue pause. Deuxième phrase après réflexion.'
  );
}

// Test 2: Mode manuel — discours long 110 secondes (~1m50) + double-clic Stop sans double envoi
{
  const h = createHarness(true);
  h.controller.startTurn();

  const chunk1Results: Array<{ text: string; isFinal: boolean }> = [];
  for (let sec = 0; sec < 40; sec += 4) {
    chunk1Results.push({ text: `Phrase étape ${sec / 4 + 1}`, isFinal: true });
    h.controller.handleRecognitionResults(makeResults(chunk1Results));
    h.clock.advanceBy(4000);
  }
  h.controller.handleRecognitionEnd();
  h.clock.advanceBy(200);
  assert.equal(h.submitted.length, 0);
  assert.equal(h.getAutoRestarts(), 1);

  h.controller.handleRecognitionResults(
    makeResults([{ text: 'Suite du discours vers cinquante secondes', isFinal: true }])
  );
  h.clock.advanceBy(10_000);
  h.controller.handleRecognitionError('no-speech');
  h.controller.handleRecognitionEnd();
  h.clock.advanceBy(200);
  assert.equal(h.submitted.length, 0);
  assert.equal(h.getAutoRestarts(), 2);

  const chunk3Results: Array<{ text: string; isFinal: boolean }> = [];
  for (let sec = 80; sec < 110; sec += 5) {
    chunk3Results.push({ text: `Conclusion bloc ${sec}`, isFinal: true });
    h.controller.handleRecognitionResults(makeResults(chunk3Results));
    h.clock.advanceBy(5000);
  }
  assert.equal(h.submitted.length, 0);

  const firstClick = h.controller.manualStop();
  const secondRapidClick = h.controller.manualStop();
  assert.equal(firstClick, true);
  assert.equal(secondRapidClick, false, 'Un double-clic ne doit jamais provoquer deux envois');
  assert.equal(h.submitted.length, 1);
  assert.ok(h.submitted[0].text.includes('Phrase étape 1'));
  assert.ok(h.submitted[0].text.includes('Suite du discours vers cinquante secondes'));
  assert.ok(h.submitted[0].text.includes('Conclusion bloc 105'));
}

// Test 3: Mode manuel — 2e clic à vide -> arrêt propre sans appel IA
{
  const h = createHarness(true);
  h.controller.startTurn();
  h.clock.advanceBy(5000);
  const sent = h.controller.manualStop();
  assert.equal(sent, false);
  assert.equal(h.submitted.length, 0);
  assert.equal(h.controller.isListeningActive(), false);
}

// =========================================================================
// MODE AUTOMATIQUE : attente stricte de 8 secondes de silence avant envoi
// =========================================================================

// Test 4A: Mode auto — pause courte (< 8s) ignorée, coupure onend relancée, envoi exactement à 8s de silence
{
  const h = createHarness(false, 8000);
  h.controller.startTurn();

  // t = 0ms : première phrase
  h.controller.handleRecognitionResults(
    makeResults([{ text: 'Bonjour Milan,', isFinal: true }])
  );
  // Pause de 4 secondes (< 8s) -> AUCUNE réponse prématurée
  h.clock.advanceBy(4000);
  assert.equal(h.submitted.length, 0, 'Ne doit pas envoyer après seulement 4s de silence');

  // t = 4000ms : nouvelle phrase -> réinitialise le délai de 8s (donc échéance = 12000ms)
  h.controller.handleRecognitionResults(
    makeResults([
      { text: 'Bonjour Milan,', isFinal: true },
      { text: 'crée une tâche pour vendredi matin.', isFinal: true },
    ])
  );

  // t = 9000ms (5s de silence) : coupure technique navigateur (onend) -> relance sans envoyer
  h.clock.advanceBy(5000);
  h.controller.handleRecognitionEnd();
  assert.equal(h.submitted.length, 0);

  // t = 11500ms (7,5s de silence) : toujours rien envoyé, l'écoute a redémarré sans perdre le texte
  h.clock.advanceBy(2500);
  assert.equal(h.getAutoRestarts(), 1);
  assert.equal(h.submitted.length, 0, 'Ne doit pas envoyer avant les 8 secondes complètes');

  // t = 12000ms (8s pile après le dernier mot à t = 4000ms) -> envoi unique
  h.clock.advanceBy(500);
  assert.equal(h.submitted.length, 1);
  assert.equal(h.submitted[0].reason, 'silence');
  assert.equal(h.submitted[0].atMs, 12_000);
  assert.equal(
    h.submitted[0].text,
    'Bonjour Milan, crée une tâche pour vendredi matin.'
  );

  // Vérifier qu'aucun timer tardif ne déclenche un second envoi
  h.clock.advanceBy(10_000);
  assert.equal(h.submitted.length, 1);
}

// Test 4B: Mode auto — un événement onresult dupliqué sans nouveaux mots ne repousse pas le délai de 8s
{
  const h = createHarness(false, 8000);
  h.controller.startTurn();

  // t = 0 : phrase finalisée
  const sameResults = makeResults([{ text: 'Quel est mon solde actuel ?', isFinal: true }]);
  h.controller.handleRecognitionResults(sameResults);

  // t = 5000ms : le navigateur réémet exactement le même résultat sans aucun nouveau mot
  h.clock.advanceBy(5000);
  h.controller.handleRecognitionResults(sameResults);

  // t = 8000ms : doit quand même envoyer à 8s du vrai dernier mot (et non repousser à t=13s)
  h.clock.advanceBy(3000);
  assert.equal(h.submitted.length, 1);
  assert.equal(h.submitted[0].atMs, 8000);
  assert.equal(h.submitted[0].text, 'Quel est mon solde actuel ?');
}

// Test 4C: Mode auto — arrêt manuel anticipé avant les 8s -> envoi unique sans double envoi ensuite
{
  const h = createHarness(false, 8000);
  h.controller.startTurn();
  h.controller.handleRecognitionResults(
    makeResults([{ text: 'Envoie ce message tout de suite', isFinal: false }])
  );

  h.clock.advanceBy(2500);
  const sent = h.controller.manualStop();
  assert.equal(sent, true);
  assert.equal(h.submitted.length, 1);
  assert.equal(h.submitted[0].reason, 'manual_stop');

  // Passer les 8s : le timer de silence a bien été annulé
  h.clock.advanceBy(10_000);
  assert.equal(h.submitted.length, 1);
}

// Test 4D: Mode auto — silence total au démarrage sans aucun mot -> aucun envoi à vide
{
  const h = createHarness(false, 8000);
  h.controller.startTurn();
  h.clock.advanceBy(15_000);
  h.controller.handleRecognitionEnd();
  h.clock.advanceBy(5000);
  assert.equal(h.submitted.length, 0);
  assert.equal(h.getMaxDurationEmptyCount(), 0);
}

// =========================================================================
// DEDUPLICATION, FRONTIERES DE MOTS & GESTION D'ERREURS
// =========================================================================

// Test 5: Déduplication stricte avec respect des frontières de mots (pas de perte)
{
  // Ne pas supprimer 'jour' après 'Bonjour', ni écraser 'On' par 'online'
  const boundarySafe = extractInstanceTranscript(
    makeResults([
      { text: 'On', isFinal: true },
      { text: "online aujourd'hui", isFinal: true },
      { text: 'Bonjour', isFinal: true },
      { text: 'jour après jour', isFinal: true },
    ])
  );
  assert.equal(
    boundarySafe.combinedText,
    "On online aujourd'hui Bonjour jour après jour"
  );

  // Déduplication des segments cumulatifs Android + chevauchement lors de reprise
  const extracted = extractInstanceTranscript(
    makeResults([
      { text: 'Bonjour Milan', isFinal: true },
      { text: 'Bonjour Milan', isFinal: true },
      { text: 'ajoute un rendez-vous', isFinal: true },
      { text: 'ajoute un rendez-vous important', isFinal: true },
      { text: 'pour vendredi matin', isFinal: false },
    ])
  );
  assert.equal(
    extracted.combinedText,
    'Bonjour Milan ajoute un rendez-vous important pour vendredi matin'
  );

  const merged = mergeTranscriptWithoutDuplicates(
    'Bonjour Milan ajoute un rendez-vous important',
    'rendez-vous important pour vendredi matin merci'
  );
  assert.equal(
    merged,
    'Bonjour Milan ajoute un rendez-vous important pour vendredi matin merci'
  );
}

// Test 6: Erreur micro/réseau -> aucune phrase perdue dans les deux modes
{
  const h = createHarness(false, 8000);
  h.controller.startTurn();
  h.controller.handleRecognitionResults(
    makeResults([
      { text: 'Note ceci dans mes projets', isFinal: true },
      { text: 'objectif livraison juin', isFinal: false },
    ])
  );

  const transient = h.controller.handleRecognitionError('network');
  assert.equal(transient.fatal, false);
  h.controller.handleRecognitionEnd();
  h.clock.advanceBy(200);
  assert.equal(
    h.controller.getFullTranscript(),
    'Note ceci dans mes projets objectif livraison juin'
  );

  const fatal = h.controller.handleRecognitionError('audio-capture');
  assert.equal(fatal.fatal, true);
  assert.equal(h.fatalErrors.length, 1);
  assert.equal(
    h.fatalErrors[0].preserved,
    'Note ceci dans mes projets objectif livraison juin'
  );
}

console.log('Audit vocal complet réussi : Mode Manuel (2e clic) + Mode Automatique (8s silence) + déduplication + erreurs.');
