// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        
        if (body.classList.contains('dark-mode')) {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
}

// Letter History Functions
function loadLetterHistory() {
    const tableBody = document.getElementById("lettersTableBody");
    const noData = document.getElementById("noData");
    
    // Load data from Google Sheets
    loadSubmissionsData().then(letters => {
        if (letters.length === 0) {
            tableBody.style.display = "none";
            noData.style.display = "block";
        } else {
            renderLettersTable(letters);
            setupFilters(letters);
        }
    });
}

function renderLettersTable(letters) {
    const tableBody = document.getElementById("lettersTableBody");
    tableBody.innerHTML = "";
    
    // Check if there's a letter ID to highlight from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get("highlight");
    
    letters.forEach(letter => {
        const row = document.createElement("tr");
        
        // Add highlight class if this is the letter to highlight
        if (highlightId && letter.id === highlightId) {
            row.classList.add("highlighted-letter");
        }
        
        // Status color classes
        const reviewStatusClass = getStatusClass(letter.reviewStatus);
        const sendStatusClass = getStatusClass(letter.sendStatus);
        
        row.innerHTML = `
            <td>${letter.id}</td>
            <td>${letter.date}</td>
            <td>${translateLetterType(letter.type)}</td>
            <td><span class="status-badge ${reviewStatusClass}">${letter.reviewStatus}</span></td>
            <td><span class="status-badge ${sendStatusClass}">${letter.sendStatus}</span></td>
            <td>${letter.recipient}</td>
            <td>${letter.subject}</td>
            <td>${letter.reviewerName || "-"}</td>
            <td>${letter.reviewNotes || "-"}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-icon" onclick="reviewLetter(\'${letter.id}\')" title="مراجعة">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-icon" onclick="downloadLetter(\'${letter.id}\')" title="تحميل وطباعة">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-icon delete" onclick="deleteLetter(\'${letter.id}\')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Scroll to highlighted letter if it exists
    if (highlightId) {
        setTimeout(() => {
            const highlightedRow = document.querySelector(".highlighted-letter");
            if (highlightedRow) {
                highlightedRow.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "center" 
                });
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    highlightedRow.classList.remove("highlighted-letter");
                }, 3000);
            }
        }, 500); // Small delay to ensure table is rendered
    }
}

function getStatusClass(status) {
    const statusMap = {
        'جاهز للإرسال': 'status-ready',
        'في الانتظار': 'status-waiting',
        'يحتاج إلى تحسينات': 'status-needs-improvement',
        'مرفوض': 'status-rejected',
        'تم الإرسال': 'status-ready'
    };
    return statusMap[status] || 'status-waiting';
}

function translateLetterType(type) {
    const typeMap = {
        'New': 'جديد',
        'Reply': 'رد',
        'Follow Up': 'متابعة',
        'Co-op': 'تعاون'
    };
    return typeMap[type] || type;
}

function setupFilters(letters) {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('letterTypeFilter');
    const reviewFilter = document.getElementById('reviewStatusFilter');
    
    const filterLetters = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedType = typeFilter.value;
        const selectedReview = reviewFilter.value;
        
        const filtered = letters.filter(letter => {
            const matchesSearch = letter.recipient.toLowerCase().includes(searchTerm) || 
                                letter.id.toLowerCase().includes(searchTerm);
            const matchesType = !selectedType || translateLetterType(letter.type) === selectedType;
            const matchesReview = !selectedReview || letter.reviewStatus === selectedReview;
            
            return matchesSearch && matchesType && matchesReview;
        });
        
        renderLettersTable(filtered);
    };
    
    searchInput.addEventListener('input', filterLetters);
    typeFilter.addEventListener('change', filterLetters);
    reviewFilter.addEventListener('change', filterLetters);
}

// Letter Actions
function reviewLetter(id) {
    window.location.href = `review-letter.html?id=${id}`;
}

function printLetter(id) {
    // Implement print functionality
    window.print();
}

async function downloadLetter(id) {
    try {
        const letters = await loadSubmissionsData();
        const letter = letters.find(l => l.id === id);
        
        if (!letter || !letter.letterLink) {
            alert('رابط الخطاب غير متوفر');
            return;
        }
        
        let viewerUrl = letter.letterLink;
        
        // For Google Drive links, use the viewer URL
        if (letter.letterLink.includes('drive.google.com')) {
            // Extract file ID and create viewer URL
            const fileId = extractGoogleDriveFileId(letter.letterLink);
            if (fileId) {
                viewerUrl = `https://drive.google.com/file/d/${fileId}/view`;
            }
        }
        
        // Open in new tab
        window.open(viewerUrl, '_blank');
        
    } catch (error) {
        console.error('Error opening letter:', error);
        alert('حدث خطأ أثناء فتح الخطاب');
    }
}

function extractGoogleDriveFileId(url) {
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /open\?id=([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    return null;
}


async function deleteLetter(id) {
    if (confirm("هل أنت متأكد من حذف هذا الخطاب؟")) {
        try {
            // Delete from Google Sheets
            await deleteLetterFromSheet(id);
            alert("تم حذف الخطاب بنجاح");
            // Reload the letter history to reflect changes without highlighting
            window.location.href = "letter-history.html";
        } catch (error) {
            console.error("Error deleting letter:", error);
            alert("حدث خطأ أثناء حذف الخطاب");
        }
    }
}

// Review Form Functions
function loadLettersForReview() {
    const letterSelect = document.getElementById('letterSelect');
    
    // Check if we have a letter ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedId = urlParams.get('id');
    
    loadSubmissionsData().then(letters => {
        // Clear existing options first
        letterSelect.innerHTML = '<option value="">اختر خطاباً</option>';
        
        letters.forEach(letter => {
            const option = document.createElement('option');
            option.value = letter.id;
            option.textContent = `${letter.id} - ${letter.recipient} - ${letter.subject}`;
            letterSelect.appendChild(option);
        });
        
        // If there's a preselected ID from URL, select it and load the letter
        if (preselectedId) {
            letterSelect.value = preselectedId;
            const reviewForm = document.getElementById('reviewForm');
            reviewForm.style.display = 'block';
            loadLetterForReview(preselectedId);
        }
    });
}

function setupReviewForm() {
    const letterSelect = document.getElementById('letterSelect');
    const reviewForm = document.getElementById('reviewForm');
    const reviewCheckbox = document.getElementById('reviewComplete');
    const actionButtons = document.querySelectorAll('.action-button');
    
    letterSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            reviewForm.style.display = 'block';
            loadLetterForReview(e.target.value);
        } else {
            reviewForm.style.display = 'none';
        }
    });
    
    reviewCheckbox.addEventListener('change', (e) => {
        actionButtons.forEach(button => {
            button.disabled = !e.target.checked;
        });
    });
    
    // Setup action buttons
    document.getElementById('readyButton').addEventListener('click', () => updateReviewStatus('جاهز للإرسال'));
    document.getElementById('improvementButton').addEventListener('click', () => updateReviewStatus('يحتاج إلى تحسينات'));
    document.getElementById('rejectedButton').addEventListener('click', () => updateReviewStatus('مرفوض'));
}

function loadLetterForReview(id) {
    // Load letter content from your data source
    loadSubmissionsData().then(letters => {
        const letter = letters.find(l => l.id === id);
        const letterContent = document.getElementById('letterContentReview');
        const reviewerNameInput = document.getElementById('reviewerName');
        const reviewNotesInput = document.getElementById('reviewNotes');
        
        if (letter) {
            // Display the actual letter content
            letterContent.value = letter.content || 'محتوى الخطاب غير متوفر';
            // Pre-fill reviewer name and notes if they exist
            reviewerNameInput.value = letter.reviewerName || '';
            reviewNotesInput.value = letter.reviewNotes || '';
        } else {
            letterContent.value = 'لم يتم العثور على الخطاب';
        }
    }).catch(error => {
        console.error('Error loading letter:', error);
        const letterContent = document.getElementById('letterContentReview');
        letterContent.value = 'حدث خطأ في تحميل محتوى الخطاب';
    });
}

async function updateReviewStatus(status) {
    const reviewerName = document.getElementById('reviewerName').value;
    const notes = document.getElementById('reviewNotes').value;
    const letterId = document.getElementById('letterSelect').value;
    
    if (!reviewerName) {
        alert('الرجاء إدخال اسم المراجع');
        return;
    }
    
    try {
        // Update the status in Google Sheets
        await updateReviewStatusInSheet(letterId, status, reviewerName, notes);
        alert(`تم تحديث حالة المراجعة إلى: ${status}`);
        
        // Redirect to letter history
        window.location.href = 'letter-history.html';
    } catch (error) {
        console.error('Error updating review status:', error);
        alert('حدث خطأ أثناء تحديث حالة المراجعة');
    }
}
