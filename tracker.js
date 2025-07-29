// Import functions from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. FIREBASE CONFIGURATION ---
// TODO: Replace with your project's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDb2cl7lsypR1ZoqHGD-mKhzN_lnDcyVEQ",
  authDomain: "website-6a5f1.firebaseapp.com",
  databaseURL: "https://website-6a5f1-default-rtdb.firebaseio.com",
  projectId: "website-6a5f1",
  storageBucket: "website-6a5f1.firebasestorage.app",
  messagingSenderId: "510903945172",
  appId: "1:510903945172:web:a5f5120db75c938721f841",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. GLOBAL STATE & UI ELEMENTS ---
let readsChart;
let allLogs = [];
let currentView = 'daily'; // can be 'hourly', 'daily', or 'monthly'

const hourlyBtn = document.getElementById('hourlyBtn');
const dailyBtn = document.getElementById('dailyBtn');
const monthlyBtn = document.getElementById('monthlyBtn');
const ctx = document.getElementById('readsChart').getContext('2d');

// --- 3. LOGGING READS ---
const logRead = async (documentId) => {
    try {
        await addDoc(collection(db, "readLogs"), {
            docId: documentId,
            timestamp: serverTimestamp(),
        });
    } catch (e) {
        console.error("Error logging read: ", e);
    }
};

document.getElementById('readDocA').addEventListener('click', () => logRead('Article A'));
document.getElementById('readDocB').addEventListener('click', () => logRead('Article B'));
document.getElementById('readDocC').addEventListener('click', () => logRead('Article C'));

// --- 4. REAL-TIME DATA LISTENER ---
const q = query(collection(db, "readLogs"));
onSnapshot(q, (querySnapshot) => {
    allLogs = [];
    querySnapshot.forEach((doc) => {
        const log = doc.data();
        if (log.timestamp) { // Ensure timestamp exists
            allLogs.push({ ...log, timestamp: log.timestamp.toDate() });
        }
    });
    renderChart(); // Re-render the chart with new data
});

// --- 5. CHART RENDERING & DATA AGGREGATION ---
function renderChart() {
    const aggregatedData = {};

    // Aggregate data based on the current view
    allLogs.forEach(log => {
        const d = log.timestamp;
        let key;
        if (currentView === 'hourly') {
            // Key: YYYY-MM-DD HH:00
            key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:00`;
        } else if (currentView === 'monthly') {
            // Key: YYYY-MM
            key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        } else { // daily
            // Key: YYYY-MM-DD
            key = d.toISOString().split('T')[0];
        }
        aggregatedData[key] = (aggregatedData[key] || 0) + 1;
    });

    const labels = Object.keys(aggregatedData).sort();
    const dataPoints = labels.map(label => aggregatedData[label]);

    // Find High and Low points for special styling
    const maxReads = Math.max(...dataPoints, 0);
    const minReads = Math.min(...dataPoints, Infinity);
    const maxIndex = dataPoints.indexOf(maxReads);
    const minIndex = dataPoints.indexOf(minReads);

    const pointRadius = dataPoints.map((_, i) => i === maxIndex || i === minIndex ? 5 : 2);
    const pointBorderWidth = dataPoints.map((_, i) => i === maxIndex || i === minIndex ? 2 : 1);

    // Create gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
    gradient.addColorStop(0, 'rgba(255, 193, 7, 0.6)');    // Yellow/Orange
    gradient.addColorStop(0.7, 'rgba(0, 150, 199, 0.3)'); // Blue
    gradient.addColorStop(1, 'rgba(0, 150, 199, 0)');     // Transparent

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Reads',
            data: dataPoints,
            fill: true,
            backgroundColor: gradient,
            borderColor: 'rgba(251, 191, 36, 1)', // Bright yellow line
            borderWidth: 2,
            tension: 0.4, // For smooth curves
            pointRadius: pointRadius,
            pointBorderWidth: pointBorderWidth,
            pointBackgroundColor: '#1c1c1e',
        }]
    };

    if (readsChart) {
        readsChart.data = chartData;
        readsChart.update();
    } else {
        readsChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'rgba(235, 235, 245, 0.6)', precision: 0 },
                        grid: { color: 'rgba(235, 235, 245, 0.1)', borderColor: 'transparent' }
                    },
                    x: {
                        ticks: { color: 'rgba(235, 235, 245, 0.6)' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#000',
                        titleFont: { weight: 'bold' },
                        bodySpacing: 5,
                        padding: 10,
                    }
                }
            }
        });
    }
}

// --- 6. VIEW SWITCHER LOGIC ---
function setView(view) {
    currentView = view;

    // Update button styles
    hourlyBtn.classList.toggle('active', view === 'hourly');
    dailyBtn.classList.toggle('active', view === 'daily');
    monthlyBtn.classList.toggle('active', view === 'monthly');

    renderChart(); // Re-render with the new time aggregation
}

hourlyBtn.addEventListener('click', () => setView('hourly'));
dailyBtn.addEventListener('click', () => setView('daily'));
monthlyBtn.addEventListener('click', () => setView('monthly'));
