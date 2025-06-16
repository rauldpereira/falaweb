document.addEventListener('DOMContentLoaded', async () => {
  const authLink = document.getElementById('auth-link');
  const authButton = document.getElementById('auth-button');

  const updateAuthButton = (isLoggedIn, userData = null) => {
      if (isLoggedIn) {
          authButton.textContent = 'Logout';
          authLink.href = '#'; 
          authLink.onclick = async (e) => {
              e.preventDefault();
              try {
                  const response = await fetch('/logout', { method: 'POST' });
                  const data = await response.json();
                  if (data.success) {
                      updateAuthButton(false);
                      window.location.reload();
                  } else {
                      alert('Falha ao fazer logout: ' + (data.message || 'Erro desconhecido'));
                  }
              } catch (error) {
                  console.error('Erro ao fazer logout:', error);
                  alert('Erro ao tentar fazer logout.');
              }
          };
      } else {
          authButton.textContent = 'Login';
          authLink.href = 'login.html';
          authLink.onclick = null;
      }
  };

  try {
      const response = await fetch('/auth/status');
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      updateAuthButton(data.loggedIn, data.user);
  } catch (error) {
      console.error('Erro ao verificar status de autenticação:', error);
      updateAuthButton(false);
  }

  const suggestionBtn = document.getElementById('suggestion-btn');
  const suggestionModal = document.getElementById('suggestion-modal');
  const closeModalBtn = document.getElementById('close-suggestion-modal');
  const loggedInContent = document.getElementById('modal-logged-in-content');
  const loggedOutContent = document.getElementById('modal-logged-out-content');
  const suggestionForm = document.getElementById('suggestion-form');
  const modalMessage = document.getElementById('modal-message');
  const startVoiceToTextBtn = document.getElementById('start-voice-to-text-btn');
  const voiceToTextOutput = document.getElementById('voice-to-text');
  const copyForVlibrasBtn = document.getElementById('copy-for-vlibras-btn');
  const textToVoiceInput = document.getElementById('text-to-voice');
  const voiceSelect = document.getElementById('voice-select');
  const speakTextBtn = document.querySelector('.purple-button');

  if (suggestionBtn) {
    suggestionBtn.onclick = async () => {
        modalMessage.textContent = ''; 
        try {
            const response = await fetch('/auth/status');
            const data = await response.json();
            if (data.loggedIn && data.user) {
                document.getElementById('suggestion-name').value = data.user.nome;
                document.getElementById('suggestion-email').value = data.user.email;
                loggedInContent.style.display = 'block';
                loggedOutContent.style.display = 'none';
            } else {
                loggedInContent.style.display = 'none';
                loggedOutContent.style.display = 'block';
            }
            suggestionModal.style.display = 'flex'; 
        } catch (error) {
            console.error("Erro ao verificar status para sugestão:", error);
            loggedInContent.style.display = 'none';
            loggedOutContent.style.display = 'block';
            modalMessage.textContent = 'Erro ao carregar. Tente novamente.';
            suggestionModal.style.display = 'flex';
        }
    };
  }

  if (closeModalBtn) {
    closeModalBtn.onclick = () => {
        suggestionModal.style.display = 'none';
    };
  }

  window.onclick = (event) => {
    if (event.target == suggestionModal) {
        suggestionModal.style.display = 'none';
    }
  };

  if (suggestionForm) {
    suggestionForm.onsubmit = async (e) => {
        e.preventDefault();
        modalMessage.textContent = 'Enviando...';
        const formData = new FormData(suggestionForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/sugestao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            modalMessage.textContent = result.message;
            if (result.success) suggestionForm.reset();
        } catch (error) {
            console.error('Erro ao enviar sugestão:', error);
            modalMessage.textContent = 'Erro ao enviar. Tente novamente.';
        }
    };
  }

  let recognition;
  if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          voiceToTextOutput.value = transcript;
          startVoiceToTextBtn.innerHTML = '<i class="fas fa-microphone"></i> Iniciar Gravação';
          startVoiceToTextBtn.disabled = false;
      };

      recognition.onerror = (event) => {
          console.error('Erro no reconhecimento de voz:', event.error);
          alert('Erro no reconhecimento de voz: ' + event.error);
          startVoiceToTextBtn.innerHTML = '<i class="fas fa-microphone"></i> Iniciar Gravação';
          startVoiceToTextBtn.disabled = false;
      };

      recognition.onend = () => {
          startVoiceToTextBtn.innerHTML = '<i class="fas fa-microphone"></i> Iniciar Gravação';
          startVoiceToTextBtn.disabled = false;
      };

      if (startVoiceToTextBtn) {
          startVoiceToTextBtn.onclick = () => {
              recognition.start();
              startVoiceToTextBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Gravando...';
              startVoiceToTextBtn.disabled = true;
          };
      }
  } else {
      if (startVoiceToTextBtn) startVoiceToTextBtn.disabled = true;
      if (voiceToTextOutput) voiceToTextOutput.value = "Reconhecimento de voz não suportado neste navegador.";
      console.warn("Reconhecimento de voz não suportado.");
  }

  if (copyForVlibrasBtn) {
      copyForVlibrasBtn.onclick = () => {
          if (voiceToTextOutput.value) {
              navigator.clipboard.writeText(voiceToTextOutput.value).then(() => {
                  alert('Texto copiado! Agora cole no VLibras.');
              }).catch(err => {
                  console.error('Falha ao copiar texto: ', err);
                  alert('Falha ao copiar texto.');
              });
          } else {
              alert('Nenhum texto para copiar.');
          }
      };
  }

  const synth = window.speechSynthesis;
  let voices = [];

  function populateVoiceList() {
      voices = synth.getVoices().filter(voice => voice.lang.startsWith('pt'));
      voiceSelect.innerHTML = '';
      voices.forEach(voice => {
          const option = document.createElement('option');
          option.textContent = `${voice.name} (${voice.lang})`;
          option.setAttribute('data-lang', voice.lang);
          option.setAttribute('data-name', voice.name);
          voiceSelect.appendChild(option);
      });
      if (voices.length === 0 && voiceSelect) {
           const option = document.createElement('option');
           option.textContent = 'Nenhuma voz em Português encontrada';
           voiceSelect.appendChild(option);
      }
  }

  if (synth && voiceSelect) {
      populateVoiceList();
      if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = populateVoiceList;
      }

      if (speakTextBtn) {
          speakTextBtn.onclick = () => {
              if (synth.speaking) {
                  console.error('Já está falando.');
                  return;
              }
              if (textToVoiceInput.value !== '') {
                  const utterThis = new SpeechSynthesisUtterance(textToVoiceInput.value);
                  utterThis.onend = () => {
                      console.log('SpeechSynthesisUtterance.onend');
                  };
                  utterThis.onerror = (event) => {
                      console.error('SpeechSynthesisUtterance.onerror', event);
                      alert('Erro ao sintetizar fala: ' + event.error);
                  };
                  const selectedOption = voiceSelect.selectedOptions[0];
                  if (selectedOption && selectedOption.getAttribute('data-name')) {
                       const selectedVoice = voices.find(voice => voice.name === selectedOption.getAttribute('data-name'));
                       utterThis.voice = selectedVoice;
                  } else if (voices.length > 0) {
                      utterThis.voice = voices[0]; 
                  }

                  synth.speak(utterThis);
              }
          };
      }
  } else {
      if (speakTextBtn) speakTextBtn.disabled = true;
      if (textToVoiceInput) textToVoiceInput.placeholder = "Síntese de voz não suportada neste navegador.";
      console.warn("Síntese de voz não suportada.");
  }
});
