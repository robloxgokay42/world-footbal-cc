const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gameLog = document.getElementById('game-log');

let userTeam = null;
let opponentTeam = null;

let gameStatus = {
    currentYear: 1,
    currentWeek: 1,
    seasonYear: "2025/26",
    nextMatchType: "Hazırlık Maçı",
    nextOpponent: null, 
};

// Top/Maç değişkenleri
let ball = { x: 400, y: 250, owner: null, vx: 0, vy: 0 };
let matchTime = 0; 
let gameState = 'STOPPED'; // STOPPED, RUNNING, PAUSED, FINISHED

// Sabitler
const PITCH_WIDTH = canvas.width;
const PITCH_HEIGHT = canvas.height;
const PLAYER_SIZE = 15;
const BALL_SIZE = 5;

// --- Takım Oluşturma Fonksiyonu (Dışarıdan çağrıldığı için buraya da koyulmalı) ---
function createOpponentTeam() {
    // Bu fonksiyon, team-creation.js'deki generateDefaultPlayers'ı kullanır.
    // Varsayım: generateDefaultPlayers global olarak erişilebilir.
    
    // (Aynı kod tekrarını önlemek için, generateDefaultPlayers'ın global olduğunu varsayıyoruz)
    const players = generateDefaultPlayers().map(p => ({
        ...p,
        name: `Rakip ${p.number}`,
        overall: Math.max(55, p.overall - Math.floor(Math.random() * 5)) 
    }));
    
    return {
        name: "Güçlü Rakip FC",
        abbr: "GRC",
        logoId: 'L_OPP',
        players: players,
        isUserTeam: false
    };
}


// --- Oyun Başlatma (Yönetim Ekranına Geçiş) ---
function startGame(teamData) {
    userTeam = teamData;
    
    // Oyun durumunu yükle veya başlat
    gameStatus.currentYear = teamData.currentYear || 1;
    gameStatus.currentWeek = teamData.currentWeek || 1;
    gameStatus.seasonYear = teamData.seasonYear || "2025/26";

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


// --- Maç Simülasyonunu Başlat ---
function startMatchSimulation(homeTeam, awayTeam) {
    // Arayüzü Maç Ekranına taşı
    document.getElementById('manager-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    userTeam = homeTeam;
    opponentTeam = awayTeam; 

    // Skorları sıfırla ve takımları yerleştir
    document.getElementById('home-score').textContent = '0';
    document.getElementById('away-score').textContent = '0';
    document.getElementById('home-team-abbr').textContent = userTeam.abbr;
    document.getElementById('away-team-abbr').textContent = opponentTeam.abbr;

    setupPlayerPositions(userTeam.players, true);
    setupPlayerPositions(opponentTeam.players, false);

    matchTime = 0;
    gameState = 'RUNNING'; 
    gameLog.innerHTML = ''; 
    
    logEvent("Maç Başladı! " + userTeam.name + " vs " + opponentTeam.name);
    gameLoop();
}

// --- Maçtan Sonra Yönetim Ekranına Dönüş ---
function finishMatch() {
    gameState = 'FINISHED'; // Döngüyü durdur
    logEvent("MAÇ SONA ERDİ!");

    // Haftayı ilerlet ve yeni maçı ayarla
    gameStatus.currentWeek++;
    
    // Basit Maç Türü Değişimi: İlk 5 hafta hazırlık, sonrası lig
    gameStatus.nextMatchType = gameStatus.currentWeek <= 5 ? "Hazırlık Maçı" : "Lig Maçı";
    gameStatus.nextOpponent = createOpponentTeam(); 

    // Yorgunluk güncellemeleri
    userTeam.players.forEach(p => {
        p.condition = Math.max(50, p.condition - 10); 
    });

    // Yönetim ekranına dön
    setTimeout(showManagerScreen, 5000); // 5 saniye sonra dön
}


// --- TEMEL OYUN MANTIĞI FONKSİYONLARI ---

function setupPlayerPositions(players, isHomeTeam) {
    const Y_DEF = isHomeTeam ? 0.8 : 0.2;
    const Y_MID = isHomeTeam ? 0.5 : 0.5;
    const Y_ATT = isHomeTeam ? 0.2 : 0.8;
    const Y_GK = isHomeTeam ? 0.95 : 0.05;
    const xPos = [0.2, 0.4, 0.6, 0.8]; 
    const xAtt = [0.4, 0.6]; 

    let defCount = 0;
    let midCount = 0;
    let attCount = 0;

    players.forEach(p => {
        let x, y;
        switch (p.position) {
            case 'GK':
                x = PITCH_WIDTH / 2; y = PITCH_HEIGHT * Y_GK; break;
            case 'DEF':
                x = PITCH_WIDTH * xPos[defCount++ % 4]; y = PITCH_HEIGHT * Y_DEF; break;
            case 'MID':
                x = PITCH_WIDTH * xPos[midCount++ % 4]; y = PITCH_HEIGHT * Y_MID; break;
            case 'ATT':
                x = PITCH_WIDTH * xAtt[attCount++ % 2]; y = PITCH_HEIGHT * Y_ATT; break;
        }

        p.x = x; p.y = y;
        p.initialX = x; p.initialY = y;
        p.team = isHomeTeam ? userTeam : opponentTeam;
    });
}

function gameLoop() {
    if (gameState !== 'RUNNING') return;
    updateGameLogic();
    drawGame();
    requestAnimationFrame(gameLoop);
}

function updateGameLogic() {
    matchTime += 1 / 60; 
    document.getElementById('match-time').textContent = formatTime(matchTime);

    if (matchTime >= 5400) { // 90 dakika (90 * 60 = 5400 saniye)
        finishMatch();
        return;
    }

    [...userTeam.players, ...opponentTeam.players].forEach(player => {
        handlePlayerMovement(player);
    });

    handleBallLogic();
    checkGoal();
}

function handlePlayerMovement(player) {
    const speed = 0.5 + (player.overall / 200); 
    const isHome = player.team === userTeam;
    let targetX, targetY;
    
    if (ball.owner === player) {
        targetX = PITCH_WIDTH / 2;
        targetY = PITCH_HEIGHT * (isHome ? 0.05 : 0.95); 
        
        const distanceToGoal = Math.sqrt(Math.pow(player.x - targetX, 2) + Math.pow(player.y - targetY, 2));
        if (distanceToGoal < 150 && Math.random() < 0.01) {
            shootBall(player, PITCH_WIDTH / 2, targetY);
            return;
        } 
        
        ball.x = player.x;
        ball.y = player.y;

        if (Math.random() < 0.005) { 
             const teamMates = player.team.players.filter(p => p !== player);
             const targetPlayer = teamMates.reduce((best, current) => {
                 const dist = Math.sqrt(Math.pow(current.x - player.x, 2) + Math.pow(current.y - player.y, 2));
                 return dist < best.distance ? { player: current, distance: dist } : best;
             }, { player: null, distance: 9999 }).player;

             if(targetPlayer) {
                 passBall(player, targetPlayer);
                 return;
             }
        }
    } else {
        const distanceToBall = Math.sqrt(Math.pow(ball.x - player.x, 2) + Math.pow(ball.y - player.y, 2));
        
        if (distanceToBall < 200) {
            targetX = ball.x;
            targetY = ball.y;
        } else {
            targetX = player.initialX;
            targetY = player.initialY;
        }
        
        if (distanceToBall < PLAYER_SIZE + BALL_SIZE && ball.owner && ball.owner.team !== player.team) {
            const stealChance = (player.skills.defending * 1.5 - ball.owner.skills.dribbling) / 100;
            if (Math.random() < 0.02 + (stealChance * 0.05)) { 
                ball.owner = player;
                ball.vx = 0; ball.vy = 0; 
                logEvent(`${player.team.abbr} - ${player.name} Topu Kaptı!`);
            }
        }
    }

    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {
        player.x += (dx / distance) * speed;
        player.y += (dy / distance) * speed;
    }

    player.x = Math.max(PLAYER_SIZE, Math.min(PITCH_WIDTH - PLAYER_SIZE, player.x));
    player.y = Math.max(PLAYER_SIZE, Math.min(PITCH_HEIGHT - PLAYER_SIZE, player.y));
}

function passBall(passer, target) {
    logEvent(`${passer.team.abbr} - ${passer.name} Pas Attı -> ${target.name}`);
    ball.owner = null; 

    const dx = target.x - passer.x;
    const dy = target.y - passer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const passPower = 6 * (passer.skills.passing / 100) * 1.5; 

    ball.vx = (dx / distance) * passPower;
    ball.vy = (dy / distance) * passPower;
    
    const inaccuracy = 0.5 * (100 - passer.skills.passing) / 100;
    ball.vx += (Math.random() - 0.5) * inaccuracy;
    ball.vy += (Math.random() - 0.5) * inaccuracy;
}

function shootBall(shooter, targetX, targetY) {
    logEvent(`${shooter.team.abbr} - ${shooter.name} Şuuuut!`);
    ball.owner = null; 

    const dx = targetX - shooter.x;
    const dy = targetY - shooter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const shootPower = 8 * (shooter.skills.shooting / 100); 

    ball.vx = (dx / distance) * shootPower;
    ball.vy = (dy / distance) * shootPower;

    const inaccuracy = 1 * (100 - shooter.skills.shooting) / 100;
    ball.vx += (Math.random() - 0.5) * inaccuracy * 2;
    ball.vy += (Math.random() - 0.5) * inaccuracy * 2;
}

function handleBallLogic() {
    if (ball.owner) return; 

    ball.x += ball.vx;
    ball.y += ball.vy;

    ball.vx *= 0.985;
    ball.vy *= 0.985;

    if (ball.x < BALL_SIZE || ball.x > PITCH_WIDTH - BALL_SIZE) {
        logEvent("Taç Atışı!");
        ball.vx = 0; ball.vy = 0; 
        ball.x = Math.max(BALL_SIZE, Math.min(PITCH_WIDTH - BALL_SIZE, ball.x));
    }
    
    // Y ekseninde çarpışma (Kale alanları dışı)
    if (ball.y < BALL_SIZE || ball.y > PITCH_HEIGHT - BALL_SIZE) {
         ball.vy *= -0.5;
    }
}

function checkGoal() {
    const goalWidthStart = PITCH_WIDTH / 3;
    const goalWidthEnd = PITCH_WIDTH * 2 / 3;
    
    // Üst Kale (Rakip Kale)
    if (ball.y < 0 && ball.x > goalWidthStart && ball.x < goalWidthEnd) {
        logEvent("⚽ GOL! " + userTeam.name + " Skor Yaptı!");
        document.getElementById('home-score').textContent = parseInt(document.getElementById('home-score').textContent) + 1;
        resetMatch();
        return;
    }

    // Alt Kale (Kendi Kalemiz)
    if (ball.y > PITCH_HEIGHT && ball.x > goalWidthStart && ball.x < goalWidthEnd) {
        logEvent("⚽ GOL! " + opponentTeam.name + " Gol Attı!");
        document.getElementById('away-score').textContent = parseInt(document.getElementById('away-score').textContent) + 1;
        resetMatch();
        return;
    }
}

function resetMatch() {
    gameState = 'STOPPED';
    ball.owner = null;
    ball.x = PITCH_WIDTH / 2;
    ball.y = PITCH_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
    
    setupPlayerPositions(userTeam.players, true);
    setupPlayerPositions(opponentTeam.players, false);

    setTimeout(() => {
        logEvent("Santra Vuruşu Başlıyor!");
        gameState = 'RUNNING';
    }, 3000);
}

// --- Çizim (Rendering) ---
function drawGame() {
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT); 
    
    ctx.beginPath();
    ctx.moveTo(PITCH_WIDTH / 2, 0);
    ctx.lineTo(PITCH_WIDTH / 2, PITCH_HEIGHT); 
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeRect(PITCH_WIDTH / 4, 0, PITCH_WIDTH / 2, 100);
    ctx.strokeRect(PITCH_WIDTH / 4, PITCH_HEIGHT - 100, PITCH_WIDTH / 2, 100);

    [...userTeam.players, ...opponentTeam.players].forEach(player => {
        drawPlayer(player, player.team === userTeam ? '#3498db' : '#e74c3c'); 
    });
    
    drawBall();
}

function drawPlayer(player, color) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.number, player.x, player.y);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.stroke();
}

function logEvent(text) {
    const p = document.createElement('p');
    p.textContent = `[${formatTime(matchTime)}] ${text}`;
    gameLog.prepend(p);
    while (gameLog.children.length > 50) {
        gameLog.removeChild(gameLog.lastChild);
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Maç ekranından geri butonu
document.getElementById('back-to-manager').onclick = () => {
    if(gameState !== 'RUNNING') {
        showManagerScreen();
    } else {
        alert("Maç devam ediyor. Simülasyonun bitmesini bekleyin.");
    }
};
