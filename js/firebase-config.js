// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJZ8wfBl4YdpRT90__qknzQhDjpPFq2ho",
    authDomain: "world-footbal-cc.firebaseapp.com",
    projectId: "world-footbal-cc",
    storageBucket: "world-footbal-cc.firebasestorage.app",
    messagingSenderId: "351376063511",
    appId: "1:351376063511:web:f395d53c4a0a1fe207b052",
    measurementId: "G-LG6LYFMJZN"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = app.firestore();

const USER_TEAM_DOC = "user_team_data";

// Firebase'den takım verisini çekip, varsa oyunu başlatır.
async function checkAndLoadTeam() {
    try {
        // Tüm ekranları gizle
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        
        const docRef = db.collection("teams").doc(USER_TEAM_DOC);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log("Kayıtlı takım bulundu. Oyunu Başlatılıyor...");
            // Eğer kayıtlı takım varsa, doğrudan yönetim ekranını başlat
            startGame(doc.data());
        } else {
            console.log("Kayıtlı takım yok. Takım kurma ekranı açılıyor.");
            // Takım yoksa, kurma ekranını göster
            document.getElementById('team-creation-screen').classList.add('active');
        }
    } catch (error) {
        console.error("Firebase'den takım verisi çekilirken hata:", error);
        // Hata durumunda da kurma ekranını göster
        document.getElementById('team-creation-screen').classList.add('active');
    }
}

// Sayfa yüklendiğinde kontrolü başlat
document.addEventListener('DOMContentLoaded', checkAndLoadTeam);
