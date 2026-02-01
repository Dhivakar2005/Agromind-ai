// OCR Document Upload Function
// Add this to app.js after the voice functions

async function uploadDocument() {
    const fileInput = document.getElementById('document-upload');
    const file = fileInput.files[0];

    if (!file) return;

    const lang = document.getElementById('chat-language')?.value || 'en';

    // Show uploading message
    addMessageToChat(`📄 Uploading document: ${file.name}...`, 'user');
    const typingId = addTypingIndicator();

    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload to OCR endpoint
        const response = await fetch(`${API_URL}/ocr/extract`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('OCR failed');
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Format the response
        let ocrResponse = `📄 **Document Scanned Successfully!**\n\n`;
        ocrResponse += `**Extracted Text:**\n${data.extracted_text}\n\n`;

        if (data.analysis) {
            ocrResponse += `**Analysis:**\n${data.analysis}\n\n`;
        }

        ocrResponse += `Confidence: ${data.confidence}% | Lines: ${data.num_lines}`;

        // Translate if not English
        if (lang !== 'en') {
            const translateResponse = await fetch(`${API_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: ocrResponse,
                    target_lang: lang,
                    source_lang: 'en'
                })
            });

            if (translateResponse.ok) {
                const translateData = await translateResponse.json();
                ocrResponse = translateData.translated_text;
            }
        }

        // Add bot response
        addMessageToChat(ocrResponse, 'bot');

        // Speak if voice enabled
        speakText(ocrResponse, lang);

        // Clear file input
        fileInput.value = '';

        showToast('Document scanned successfully!', 'success');

    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToChat('Sorry, failed to process the document. Please try again.', 'bot');
        showToast('OCR failed: ' + error.message, 'error');
        fileInput.value = '';
    }
}
