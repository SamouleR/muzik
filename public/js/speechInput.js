/**
 * Speech Input — Web Speech API wrapper avec fallback texte
 */
const SpeechInput = (() => {
  let recognition = null;
  let isListening = false;
  let isSupported = false;
  let onResult = null;
  let onInterim = null;
  let finalTranscript = '';
  let silenceTimer = null;

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      isSupported = true;
      recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = '';
        finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        // Show interim results
        if (interim && onInterim) {
          onInterim(interim);
        }

        // Final result
        if (finalTranscript && onResult) {
          onResult(finalTranscript);
          stopListening();
        }

        // Reset silence timer
        resetSilenceTimer();
      };

      recognition.onerror = (event) => {
        console.warn('[SpeechInput] Error:', event.error);
        if (event.error === 'not-allowed') {
          UIEffects.showToast('Microphone bloqué ! Autorise l\'accès au micro.', 'error');
        }
        stopListening();
      };

      recognition.onend = () => {
        // Si on a un transcript en attente, l'envoyer
        if (finalTranscript && onResult) {
          onResult(finalTranscript);
        }
        updateUI(false);
        isListening = false;
        clearSilenceTimer();
      };
    } else {
      isSupported = false;
      // Update UI pour montrer que la voix n'est pas dispo
      const micBtn = document.getElementById('btn-mic');
      if (micBtn) {
        micBtn.style.opacity = '0.3';
        micBtn.style.cursor = 'not-allowed';
        micBtn.title = 'Reconnaissance vocale non supportée dans ce navigateur';
      }
      const status = document.getElementById('speech-status');
      if (status) {
        status.textContent = 'Voix non supportée — tape ta réponse';
      }
    }
  }

  function startListening() {
    if (!isSupported || !recognition || isListening) return;

    finalTranscript = '';
    isListening = true;

    try {
      recognition.start();
    } catch (e) {
      // Already started
      console.warn('[SpeechInput] Already started');
    }

    updateUI(true);
    resetSilenceTimer();
  }

  function stopListening() {
    if (!recognition || !isListening) return;

    isListening = false;
    clearSilenceTimer();

    try {
      recognition.stop();
    } catch (e) {
      // Already stopped
    }

    updateUI(false);
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function resetSilenceTimer() {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (isListening) {
        stopListening();
      }
    }, 3000); // Auto-stop après 3s de silence
  }

  function clearSilenceTimer() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function updateUI(listening) {
    const micBtn = document.getElementById('btn-mic');
    const status = document.getElementById('speech-status');

    if (micBtn) {
      micBtn.classList.toggle('listening', listening);
    }

    if (status) {
      status.textContent = listening
        ? '🔴 Écoute en cours…'
        : 'Clique sur le micro ou tape ta réponse';
    }
  }

  /**
   * Configure les callbacks
   */
  function setCallbacks(resultCb, interimCb) {
    onResult = resultCb;
    onInterim = interimCb;
  }

  return {
    init,
    startListening,
    stopListening,
    toggleListening,
    setCallbacks,
    get isSupported() { return isSupported; },
    get isListening() { return isListening; },
  };
})();
