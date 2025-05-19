document.addEventListener('DOMContentLoaded', () => {
    const voiceToTextButton = document.querySelector('.blue-button');
    const voiceToTextTextArea = document.getElementById('voice-to-text');

    const copyForVLibrasButton = document.getElementById('copy-for-vlibras-btn');

    if (copyForVLibrasButton && voiceToTextTextArea) {
        copyForVLibrasButton.addEventListener('click', () => {
            const textToCopy = voiceToTextTextArea.value;

            if (textToCopy.trim() !== "") {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                      const vlibrasActivationButton = document.querySelector('div[vw-access-button]');
                      if (vlibrasActivationButton) {
                          vlibrasActivationButton.click();
                      }
                    })
                    .catch(err => {
                        console.error('Falha ao copiar texto: ', err);
                        alert('Erro ao copiar o texto. Por favor, tente copiar manualmente (Ctrl+C).');
                    });
            } else {
                alert('Não há texto para copiar. Grave sua voz primeiro.');
            }
        });
    } else {
        if (!copyForVLibrasButton) console.warn("Botão 'copy-for-vlibras-btn' não encontrado.");
        if (!voiceToTextTextArea) console.warn("Textarea 'voice-to-text' não encontrada.");
    }

  
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
  
      let isRecording = false;
  
      recognition.onstart = () => {
        isRecording = true;
        voiceToTextButton.textContent = 'Gravando...';
      };
  
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        voiceToTextTextArea.value = transcript;
      };
  
      recognition.onerror = (event) => {
        console.error('Erro no reconhecimento:', event.error);
      };
  
      recognition.onend = () => {
        if (isRecording) {
          recognition.start();
        } else {
          voiceToTextButton.textContent = 'Iniciar Gravação';
        }
      };
  
      voiceToTextButton.addEventListener('click', () => {
        if (!isRecording) {
          recognition.start();
        } else {
          isRecording = false;
          recognition.stop();
        }
      });
    } else {
      voiceToTextTextArea.value = 'Seu navegador não suporta reconhecimento de voz.';
      voiceToTextButton.disabled = true;
    }
    const textToVoiceTextArea = document.getElementById('text-to-voice');
    const voiceSelect = document.getElementById('voice-select');
    const textToVoiceButton = document.querySelector('.purple-button');
    let voices = [];
    
    function populateVoiceList() {
      voices = speechSynthesis.getVoices();
      voiceSelect.innerHTML = '<option value="">Selecione uma voz</option>';
      voices.forEach((voice) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        voiceSelect.appendChild(option);
      });
    }
    
    if ('speechSynthesis' in window) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          populateVoiceList();
          if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
          }
    
          textToVoiceButton.addEventListener('click', () => {
            const text = textToVoiceTextArea.value;
            if (text) {
              const utterance = new SpeechSynthesisUtterance(text);
              const selectedVoice = voiceSelect.value;
              if (selectedVoice) {
                utterance.voice = voices.find((voice) => voice.name === selectedVoice);
              }
              speechSynthesis.speak(utterance);
            }
          });
        })
        .catch((error) => {
          console.error('Error requesting permission:', error);
        });
    } else {
      textToVoiceTextArea.value = 'Seu navegador não suporta sintetização de voz.';
      textToVoiceButton.disabled = true;
      voiceSelect.disabled = true;
    }
    
  });