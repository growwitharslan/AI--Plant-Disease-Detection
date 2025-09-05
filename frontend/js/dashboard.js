async function fetchPredictions(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`../backend/get_predictions.php?${params}`);
        console.log('API Response Status:', response.status);
        const predictions = await response.json();
        console.log('API Response Data:', predictions);
        if (predictions.error) {
            console.error('API Error:', predictions.error);
            document.getElementById('errorMessage').textContent = `Error: ${predictions.error}`;
            document.getElementById('errorMessage').classList.remove('hidden');
            return [];
        }
        return predictions;
    } catch (error) {
        console.error('Fetch Error:', error);
        document.getElementById('errorMessage').textContent = 'Failed to connect to backend. Please check the server or get_predictions.php path.';
        document.getElementById('errorMessage').classList.remove('hidden');
        return [];
    }
}

function renderTable(predictions) {
    console.log('Rendering Table with Predictions:', predictions);
    const tbody = document.querySelector('#predictionsTable tbody');
    tbody.innerHTML = '';
    if (predictions.length === 0) {
        // Mock data for testing
        const mockData = [
            {
                id: 1,
                image_name: 'test_leaf.jpg',
                prediction: 'healthy',
                confidence: 0.9046,
                prob_healthy: 0.9046,
                prob_diseased: 0.0954,
                created_at: '2025-05-04 10:00:00'
            }
        ];
        console.log('Using mock data for testing:', mockData);
        predictions = mockData; // Comment this out after confirming database data
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No predictions found in database. Showing mock data.</td></tr>';
    }
    predictions.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.id}</td>
            <td>${p.image_name}</td>
            <td>${p.prediction.charAt(0).toUpperCase() + p.prediction.slice(1)}</td>
            <td>${(p.confidence * 100).toFixed(2)}%</td>
            <td>${(p.prob_healthy * 100).toFixed(2)}%</td>
            <td>${(p.prob_diseased * 100).toFixed(2)}%</td>
            <td>${new Date(p.created_at).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderPieChart(predictions) {
    console.log('Rendering Pie Chart with Predictions:', predictions);
    const ctx = document.getElementById('pieChart').getContext('2d');
    const healthyCounts = predictions.filter(p => p.prediction === 'healthy').length;
    const diseasedCounts = predictions.filter(p => p.prediction === 'diseased').length;

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Healthy', 'Diseased'],
            datasets: [{
                data: [healthyCounts, diseasedCounts],
                backgroundColor: ['#2A9D8F', '#F4A261'],
                borderColor: ['#264653', '#E76F51'],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 14, family: 'Nunito' } }
                }
            }
        }
    });
}

function renderTimelineChart(predictions) {
    console.log('Rendering Timeline Chart with Predictions:', predictions);
    const ctx = document.getElementById('timelineChart').getContext('2d');
    const dates = [...new Set(predictions.map(p => new Date(p.created_at).toLocaleDateString()))];
    const healthyData = dates.map(date => 
        predictions.filter(p => new Date(p.created_at).toLocaleDateString() === date && p.prediction === 'healthy').length
    );
    const diseasedData = dates.map(date => 
        predictions.filter(p => new Date(p.created_at).toLocaleDateString() === date && p.prediction === 'diseased').length
    );

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Healthy',
                    data: healthyData,
                    borderColor: '#2A9D8F',
                    backgroundColor: 'rgba(42, 157, 143, 0.2)',
                    fill: true
                },
                {
                    label: 'Diseased',
                    data: diseasedData,
                    borderColor: '#F4A261',
                    backgroundColor: 'rgba(244, 162, 97, 0.2)',
                    fill: true
                }
            ]
        },
        options: {
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Count' } }
            },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function exportToCsv(predictions) {
    console.log('Exporting CSV with Predictions:', predictions);
    const headers = ['ID,Image Name,Prediction,Confidence,Healthy (%),Diseased (%),Date'];
    const rows = predictions.map(p => 
        `${p.id},${p.image_name},${p.prediction},${(p.confidence * 100).toFixed(2)},${(p.prob_healthy * 100).toFixed(2)},${(p.prob_diseased * 100).toFixed(2)},${p.created_at}`
    );
    const csv = headers.concat(rows).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predictions.csv';
    a.click();
    URL.revokeObjectURL(url);
}

async function init() {
    let predictions = await fetchPredictions();
    renderTable(predictions);
    renderPieChart(predictions);
    renderTimelineChart(predictions);

    const searchInput = document.getElementById('search');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const predictionFilter = document.getElementById('predictionFilter');

    async function updateFilters() {
        const filters = {
            start_date: startDate.value,
            end_date: endDate.value,
            prediction: predictionFilter.value
        };
        predictions = await fetchPredictions(filters);
        if (searchInput.value) {
            predictions = predictions.filter(p => p.image_name.toLowerCase().includes(searchInput.value.toLowerCase()));
        }
        renderTable(predictions);
        renderPieChart(predictions);
        renderTimelineChart(predictions);
    }

    searchInput.addEventListener('input', updateFilters);
    startDate.addEventListener('change', updateFilters);
    endDate.addEventListener('change', updateFilters);
    predictionFilter.addEventListener('change', updateFilters);

    document.getElementById('exportCsv').addEventListener('click', () => {
        exportToCsv(predictions);
    });

    document.querySelectorAll('#predictionsTable th').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            const order = th.classList.toggle('asc') ? 1 : -1;
            predictions.sort((a, b) => {
                const aVal = a[key];
                const bVal = b[key];
                if (typeof aVal === 'string') {
                    return order * aVal.localeCompare(bVal);
                }
                return order * (aVal - bVal);
            });
            renderTable(predictions);
            document.querySelectorAll('#predictionsTable th').forEach(t => t.classList.remove('asc'));
            if (order === 1) th.classList.add('asc');
        });
    });
}

init();