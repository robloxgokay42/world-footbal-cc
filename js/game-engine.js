// ... (Canvas, ctx, Sabitler, createOpponentTeam aynı kaldı) ...

let userTeam = null;
let opponentTeam = null;
let gameStatus = {
    currentYear: 1,
    currentWeek: 1,
    nextMatchType: "Hazırlık Maçı",
    nextOpponent: null, // Dinamik olarak atanacak
    seasonYear: "2025/26"
};

// Top/Maç değişkenleri
let ball = { x: 400, y: 250, owner: null, vx: 0, vy: 0 };
let matchTime = 0; 
let gameState = 'STOPPED'; 

// --- Oyun Başlatma (Yönetim Ekranına Geçiş) ---
function startGame(teamData) {
    userTeam = teamData;
    
    // Oyun durumunu yükle veya başlat
    gameStatus.currentYear = teamData.currentYear || 1;
    gameStatus.currentWeek = teamData.currentWeek || 1;

    // Rakip takımı oluştur (Şimdilik her zaman rastgele)
    gameStatus.nextOpponent = createOpponentTeam(); 

    showManagerScreen();
}

// --- Yönetim Ekranını Göster ve Bilgileri Yükle ---
function showManagerScreen() {
    // Tüm ekranları gizle ve Yönetim ekranını göster
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById('manager-screen').classList.add('active');

    // Başlık/Durum Bilgilerini Güncelle
    document.getElementById('user-team-name-manager').textContent = userTeam.name;
    document.getElementById('money-display-manager').textContent = '₿ ' + userTeam.money.toLocaleString('tr-TR');
    
    // Tarih/Hafta Bilgisini Güncelle
    const yearDisplay = `Yıl ${gameStatus.currentYear} (${gameStatus.seasonYear}) - Hafta ${gameStatus.currentWeek}`;
    document.getElementById('date-display').textContent = yearDisplay;

    // Sıradaki Maç Bilgisini Güncelle
    document.getElementById('match-type').textContent = gameStatus.nextMatchType;
    document.getElementById('match-teams').textContent = `${userTeam.abbr} vs ${gameStatus.nextOpponent.abbr}`;
    document.getElementById('match-date').textContent = `${gameStatus.currentWeek}. Hafta`;
    
    // Takım Yönetimi Bilgilerini Güncelle (Basit yer tutucular)
    // Taktik ayarları şimdilik sabit kalacak

    // Haftayı Geç / Maça Çık butonuna olay ekle
    document.getElementById('simulate-week-btn').onclick = handleNextStep;
}

// --- Haftayı Geç / Maça Çık Butonu İşlevi ---
function handleNextStep() {
    if (gameStatus.nextMatchType.includes("Maçı")) {
        // Eğer sırada maç varsa, simülasyonu başlat
        startMatchSimulation(userTeam, gameStatus.nextOpponent);
    } else {
        // Maç yoksa, sadece haftayı simüle et (Geliştirilecek)
        simulateWeekEvents();
    }
}


// --- Maç Simülasyonunu Başlat (Önceki startGame'in yeni hali) ---
function startMatchSimulation(homeTeam, awayTeam) {
    // Arayüzü Maç Ekranına taşı
    document.getElementById('manager-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    // Maç öncesi ayarlamalar
    userTeam = homeTeam;
    opponentTeam = awayTeam; // Rakip takım

    // Skorları sıfırla ve takımları yerleştir
    document.getElementById('home-score').textContent = '0';
    document.getElementById('away-score').textContent = '0';
    document.getElementById('home-team-abbr').textContent = userTeam.abbr;
    document.getElementById('away-team-abbr').textContent = opponentTeam.abbr;

    setupPlayerPositions(userTeam.players, true);
    setupPlayerPositions(opponentTeam.players, false);

    matchTime = 0;
    gameState = 'RUNNING'; 
    gameLog.innerHTML = ''; // Günlüğü temizle
    
    logEvent("Maç Başladı! " + userTeam.name + " vs " + opponentTeam.name);
    gameLoop();
}

// --- Maçtan Sonra Yönetim Ekranına Dönüş ---
function finishMatch() {
    gameState = 'FINISHED'; // Döngüyü durdur

    // Maç sonuçlarını kaydet (Geliştirilecek)
    
    // Haftayı ilerlet
    gameStatus.currentWeek++;
    // Gelecek maç türünü belirle (Geliştirilecek: Lig/Kupa mantığı)
    gameStatus.nextMatchType = gameStatus.currentWeek <= 5 ? "Hazırlık Maçı" : "Lig Maçı";
    gameStatus.nextOpponent = createOpponentTeam(); // Yeni rakip

    // Yorgunluk güncellemeleri (Maç oynayanlar yorulur)
    userTeam.players.forEach(p => {
        // Basitçe: Maç oynayanlar %10 kondisyon kaybeder
        p.condition = Math.max(50, p.condition - 10); 
    });

    // Firebase'deki haftayı ve oyuncu durumlarını güncelle (Geliştirilecek)

    // Yönetim ekranına dön
    setTimeout(showManagerScreen, 5000); // 5 saniye sonra dön
}


// --- Diğer Oyun Mantığı Fonksiyonları (Önceki Maç Simülasyonu Kodları) ---
// handlePlayerMovement, passBall, shootBall, handleBallLogic, checkGoal, resetMatch, drawGame, drawPlayer, drawBall, logEvent, formatTime
// ... (Tüm bu fonksiyonlar game-engine.js'in altında kalmaya devam etmeli) ...

// Maç ekranından geri butonu
document.getElementById('back-to-manager').onclick = () => {
    if(gameState !== 'RUNNING') {
        showManagerScreen();
    } else {
        alert("Maç devam ediyor. Simülasyonun bitmesini bekleyin.");
    }
};

// Maçta gol olunca/bitince finishMatch'i çağırmak için checkGoal ve resetMatch fonksiyonlarını buna göre güncelleyin.
function checkGoal() {
    // ... (Gol kontrolü) ...
    if (/* Gol olduysa */ true) {
        // ...
        if (matchTime >= 5400) { // 90 dakika (90 * 60 = 5400)
             logEvent("MAÇ SONA ERDİ!");
             finishMatch();
             return;
        }
        // ...
    }
}
//...
