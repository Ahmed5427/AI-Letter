// API Configuration
const API_BASE_URL = 'https://128.140.37.194:5000';

// Generate Letter API
async function generateLetter(formData) {
    const loader = document.getElementById('loader');
    loader.classList.add('active');
    
    try {
        // Determine the recipient_title to send
        let finalRecipientTitle = formData.get('recipient_title');
        const otherRecipientTitle = formData.get('other_recipient_title');

        if (finalRecipientTitle === 'أخرى' && otherRecipientTitle) {
            finalRecipientTitle = otherRecipientTitle;
        }

        // Prepare the payload
        const payload = {
            type: formData.get('type'),
            category: formData.get('category'), // Now a text field
            recipient: formData.get('recipient'),
            isFirst: formData.get('isFirst') === 'true',
            prompt: formData.get('prompt'),
            organization_name: formData.get('organization_name'), // New field
            recipient_job_title: formData.get('recipient_job_title'), // New field
            recipient_title: finalRecipientTitle, // Updated logic for recipient_title
        };

        // Only include member_name if a value is selected
        const memberName = formData.get('member_name');
        if (memberName && memberName.trim() !== '') {
            payload.member_name = memberName;
        }

        // Handle previous letter content for follow-up letters
        const previousLetterId = formData.get('previous_letter_id');
        if (previousLetterId && previousLetterId.trim() !== '') {
            const previousLetterSelect = document.getElementById('previousLetter');
            const selectedOption = previousLetterSelect.querySelector(`option[value="${previousLetterId}"]`);
            if (selectedOption && selectedOption.dataset.content) {
                payload.previous_letter_content = selectedOption.dataset.content;
                payload.previous_letter_id = previousLetterId;
            }
        }
        
        // Since we can't directly call HTTPS with self-signed cert from browser,
        // we'll use a proxy endpoint
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                endpoint: 'generate-letter',
                data: payload
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate letter');
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error generating letter:', error);
        alert('حدث خطأ أثناء إنشاء الخطاب. الرجاء المحاولة مرة أخرى.');
        return null;
    } finally {
        loader.classList.remove('active');
    }
}

// Archive Letter API
async function archiveLetter(formData) {
    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            body: formData // Send FormData directly, don't set Content-Type header
        });
        
        if (!response.ok) {
            throw new Error('Failed to archive letter');
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error archiving letter:', error);
        alert('حدث خطأ أثناء حفظ الخطاب. الرجاء المحاولة مرة أخرى.');
        return null;
    }
}

// Form submission handler
if (document.getElementById('letterForm')) {
    document.getElementById('letterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const result = await generateLetter(formData);
        
        if (result) {
            // Display the generated letter in both formats
            document.getElementById('letterPreview').value = result.Letter || 'محتوى الخطاب المُنشأ سيظهر هنا...';
            
            // Populate the document template
            if (typeof populateDocumentTemplate === 'function') {
                populateDocumentTemplate(result, formData);
            }
            
            document.getElementById('previewSection').style.display = 'block';
            
            // Store the generated letter data
            window.generatedLetterData = result;
        }
    });
}

// Save button handler
if (document.getElementById('saveButton')) {
    document.getElementById('saveButton').addEventListener('click', async () => {
        const letterContent = document.getElementById('letterPreview').value;
        const selectedTemplate = document.querySelector('input[name="template"]:checked').value;
        
        // Generate PDF from letter content
        const pdfBlob = await generatePDF(letterContent, selectedTemplate);
        
        // Prepare archive data as FormData
        const formData = new FormData();
        formData.append('file', pdfBlob, 'letter.pdf');
        formData.append('letter_content', letterContent);
        formData.append('letter_type', document.getElementById('letterType').value);
        formData.append('recipient', document.getElementById('recipient').value);
        
        // Use the title from the generated letter data
        if (window.generatedLetterData && window.generatedLetterData.Title) {
            formData.append('title', window.generatedLetterData.Title);
        } else {
            // Fallback if title is not available from generated data
            formData.append('title', 'Untitled Letter'); 
        }

        formData.append('is_first', document.querySelector('input[name="isFirst"]:checked').value);
        
        // Use the ID from the generated letter data
        if (window.generatedLetterData && window.generatedLetterData.ID) {
            formData.append('ID', window.generatedLetterData.ID);
        } else {
            // Fallback if ID is not available from generated data
            formData.append('ID', generateUniqueId()); 
        }
        
        const result = await archiveLetter(formData);
        
        if (result) {
            alert('تم حفظ الخطاب بنجاح!');
            // Navigate to letter history page with the letter ID to highlight it
            const letterId = window.generatedLetterData && window.generatedLetterData.ID ? 
                window.generatedLetterData.ID : 
                generateUniqueId();
            window.location.href = `letter-history.html?highlight=${letterId}`;
        }
    });
}

// Generate unique ID for letters
function generateUniqueId() {
    return 'L' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function generatePDF(content, template) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Base64 encoded Amiri-Regular.ttf font data
        // YOU NEED TO REPLACE THIS WITH THE ACTUAL BASE64 STRING OF YOUR FONT
        const AMIRI_FONT_BASE64 = ""; 

        // Add the font to jsPDF
        doc.addFileToVFS("Amiri-Regular.ttf", AMIRI_FONT_BASE64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");

        // Set the font for the document
        doc.setFont("Amiri");
        doc.setFontSize(12);

        // Split content into lines to fit page width
        const lines = doc.splitTextToSize(content, 180);

        // Add content to PDF
        doc.text(lines, 15, 20);

        // Convert to blob
        const pdfBlob = doc.output("blob");
        return pdfBlob;
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        // Fallback: create a simple text file as blob
        const textBlob = new Blob([content], { type: 'text/plain' });
        return textBlob;
    }
}

// Generate unique ID
function generateUniqueId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
}

