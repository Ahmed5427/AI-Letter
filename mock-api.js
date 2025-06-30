// Mock letter generation for testing
function mockGenerateLetter() {
    return {
        Letter: "I am writing to provide a strong recommendation for John Smith, who has been an exceptional student in my Advanced Mathematics course. John has consistently demonstrated outstanding academic performance, achieving top grades throughout the semester. His analytical thinking skills and problem-solving abilities are remarkable. I believe John would be an excellent addition to your university program and I highly recommend him for admission.",
        Title: "Letter of Recommendation",
        ID: "L001-2024"
    };
}

// Override the generateLetter function for testing
if (typeof window !== 'undefined') {
    window.mockGenerateLetter = mockGenerateLetter;
}

