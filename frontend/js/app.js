const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('imagePreview');
const uploadForm = document.getElementById('uploadForm');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultCard = document.getElementById('resultCard');
const diagnosis = document.getElementById('diagnosis');
const confidence = document.getElementById('confidence');
const probHealthy = document.getElementById('probHealthy');
const probDiseased = document.getElementById('probDiseased');
const loading = document.getElementById('loading');
const confetti = new JSConfetti();

dropZone.addEventListener('click', () => imageInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-[#F5F6F5]');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-[#F5F6F5]');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-[#F5F6F5]');
    const files = e.dataTransfer.files;
    if (files.length) {
        imageInput.files = files;
        previewImage(files[0]);
    }
});

imageInput.addEventListener('change', () => {
    if (imageInput.files.length) {
        previewImage(imageInput.files[0]);
    }
});

function previewImage(file) {
    const reader = new FileReader();
    reader.onload = () => {
        imagePreview.innerHTML = `<img src="${reader.result}" alt="Preview" class="rounded-xl">`;
    };
    reader.readAsDataURL(file);
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultCard.classList.add('hidden');
    diagnosis.textContent = '';
    confidence.textContent = '';
    probHealthy.textContent = '';
    probDiseased.textContent = '';
    
    progressBar.classList.remove('hidden');
    progress.style.width = '0%';
    analyzeBtn.disabled = true;
    loading.classList.remove('hidden');

    try {
        const response = await fetch('../backend/analyze.php', {
            method: 'POST',
            body: new FormData(uploadForm)
        });
        
        console.log('Analyze Response Status:', response.status);
        const data = await response.json();
        console.log('Analyze Response Data:', JSON.stringify(data, null, 2));
        
        progress.style.width = '100%';
        setTimeout(() => {
            progressBar.classList.add('hidden');
            loading.classList.add('hidden');
            analyzeBtn.disabled = false;
            
            if (data.error) {
                diagnosis.textContent = `Error: ${data.error}`;
                resultCard.classList.remove('hidden');
                gsap.from(resultCard, { duration: 0.5, scale: 0.8, opacity: 0, ease: 'back.out(1.7)' });
            } else {
                diagnosis.textContent = `Diagnosis: ${data.prediction.charAt(0).toUpperCase() + data.prediction.slice(1)}`;
                confidence.textContent = `Confidence: ${(data.confidence * 100).toFixed(2)}%`;
                probHealthy.textContent = `Healthy: ${isNaN(data.prob_healthy) || data.prob_healthy == null ? 'N/A' : (data.prob_healthy * 100).toFixed(2) + '%'}`;
                probDiseased.textContent = `Diseased: ${isNaN(data.prob_diseased) || data.prob_diseased == null ? 'N/A' : (data.prob_diseased * 100).toFixed(2) + '%'}`;
                resultCard.classList.remove('hidden');
                gsap.from(resultCard, { duration: 0.5, scale: 0.8, opacity: 0, ease: 'back.out(1.7)' });
                confetti.addConfetti({ emojis: ['🌿', '🍃'], confettiNumber: 50 });
            }
        }, 500);
    } catch (error) {
        console.error('Upload Error:', error);
        progressBar.classList.add('hidden');
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
        diagnosis.textContent = 'Failed to analyze image. Please check the backend or Flask API.';
        resultCard.classList.remove('hidden');
        gsap.from(resultCard, { duration: 0.5, scale: 0.8, opacity: 0, ease: 'back.out(1.7)' });
    }
});