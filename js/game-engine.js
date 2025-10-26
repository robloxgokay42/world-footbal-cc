const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gameLog = document.getElementById('game-log');

let userTeam = null;
let opponentTeam = null;
let ball = { x: canvas.width / 2, y: canvas.height / 2, owner: null };
let matchTime = 0; // Saniye cinsinden
let gameState = 'STOPPED'; // STOPPED, RUNNING, PAUSED

// Saha boyutları
const PITCH_WIDTH = canvas.width;
const PITCH_HEIGHT = canvas.height;
const PLAYER_SIZE = 15;
const BALL_SIZE = 5;

// --- Oyuncu/Takım Verisi ---

// Basit bir rakip takım oluşturucu
function createOpponentTeam() {
    return {
        name: "Rakip FC",
        abbr: "RFC",
        logoId: 'L_OPP',
        players: generateDefaultPlayers().map(p => ({
            ...p,
            name: `Rakip ${p.number}`,
            // Rakip oyuncuların yeteneklerini biraz düşürelim (zorluk ayarı)
            overall: Math.max(50, p.overall - Math.floor(Math.random() * 10)) 
        })),
        isUserTeam: false
    };
}

// --- Oyun Başlatma ---
function startGame(teamData) {
    userTeam = teamData;
    opponentTeam = createOpponentTeam(); 

    // Oyuncuların başlangıç pozisyonlarını ayarla
    setupPlayerPositions(userTeam.players, true);
    setupPlayerPositions(opponentTeam.players, false);

    document.getElementById('game-screen').classList.add('active');
    
    // Maç Ayarları (Şimdilik tek maç)
    matchTime = 0;
    gameState = 'RUNNING';
    
    logEvent("Maç Başladı! " + userTeam.name + " vs " + opponentTeam.name);
    // Oyun döngüsünü başlat
    gameLoop();
}

// Oyuncuların sahada başlangıç pozisyonlarını ayarlar (Çok basit 4-4-2 dizilişi)
function setupPlayerPositions(players, isHomeTeam) {
    const yFactor = isHomeTeam ? 0.9 : 0.1; // Kendi yarı sahamız
    const xPositions = [0.1, 0.3, 0.5, 0.7, 0.9]; // Saha genişliğine göre pozisyonlar
    
    // Basit bir pozisyon ataması
    players.forEach(p => {
        let x, y;
        const index = p.number - 1; // 0'dan başla

        if (p.position === 'GK') {
            x = PITCH_WIDTH / 2;
            y = PITCH_HEIGHT * (isHomeTeam ? 0.95 : 0.05);
        } else if (p.position === 'DEF') {
            x = PITCH_WIDTH * xPositions[index % 4 + 1]; // 4 defans
            y = PITCH_HEIGHT * (isHomeTeam ? 0.75 : 0.25);
        } else if (p.position === 'MID') {
            x = PITCH_WIDTH * xPositions[index % 4 + 1]; // 4 orta saha
            y = PITCH_HEIGHT * (isHomeTeam ? 0.5 : 0.5);
        } else if (p.position === 'ATT') {
            x = PITCH_WIDTH * xPositions[index % 2 + 2]; // 2 forvet
            y = PITCH_HEIGHT * (isHomeTeam ? 0.25 : 0.75);
        }

        // Oyuncu objesine pozisyon ekle
        p.x = x;
        p.y = y;
        p.targetX = x; // AI için hedef pozisyon
        p.targetY = y;
        p.team = isHomeTeam ? userTeam : opponentTeam;
    });
}

// --- Oyun Döngüsü ---
function gameLoop() {
    if (gameState !== 'RUNNING') return;

    updateGameLogic();
    drawGame();

    // Saniyede ~60 kare için
    requestAnimationFrame(gameLoop);
}

// --- Maç Mantığı (Her Karede Çalışır) ---
function updateGameLogic() {
    // 1. Maç Zamanını Güncelle (Basitçe 60 FPS'de her saniye 1 saniye ekle)
    matchTime += 1 / 60; 
    document.getElementById('match-time').textContent = formatTime(matchTime);

    // 2. Oyuncu AI ve Hareketleri
    [...userTeam.players, ...opponentTeam.players].forEach(player => {
        handlePlayerMovement(player);
    });

    // 3. Top Fiziği ve Kontrolü
    handleBallLogic();
    
    // 4. Maç Olayları (Korner, Taç, Gol vb. - Şimdilik çok basit)
    checkGoal();
}

// --- Çizim (Rendering) ---
function drawGame() {
    // Sahayı Temizle
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT);
    
    // Orta saha ve çizgileri çiz (Çok basit)
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT); // Dış Çizgiler
    ctx.beginPath();
    ctx.moveTo(PITCH_WIDTH / 2, 0);
    ctx.lineTo(PITCH_WIDTH / 2, PITCH_HEIGHT); // Orta Çizgi
    ctx.stroke();
    
    // Oyuncuları çiz
    [...userTeam.players, ...opponentTeam.players].forEach(player => {
        drawPlayer(player, player.team.isUserTeam ? 'blue' : 'red');
    });
    
    // Topu çiz
    drawBall();
}

// Tek bir oyuncuyu çizer
function drawPlayer(player, color) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Oyuncu Numarasını Yaz
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.number, player.x, player.y);
}

// Topu çizer
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.stroke();
}

// --- Alt Fonksiyonlar ---

// Oyuncu hareketini yönetir (Basit takipçi AI)
function handlePlayerMovement(player) {
    // Eğer topa sahip değilse, topu veya pozisyonunu takip et
    if (ball.owner !== player) {
        
        // Basit AI: Topa doğru hareket et (Yüksek yetenekli oyuncu daha hızlı koşar)
        const speed = 0.5 + (player.overall / 200); 

        // Topun yeri
        const targetX = ball.x;
        const targetY = ball.y;

        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > PLAYER_SIZE / 2) {
            player.x += (dx / distance) * speed;
            player.y += (dy / distance) * speed;
        }

        // Topa yaklaşınca topu al
        if (distance < PLAYER_SIZE + BALL_SIZE) {
            if (ball.owner && ball.owner.team !== player.team) {
                // Top çalma mekaniği (Daha sonra geliştirilecek)
                const stealChance = (player.skills.defending - ball.owner.skills.dribbling) / 100;
                if (Math.random() < 0.05 + stealChance) { // %5 temel şans + yetenek farkı
                    ball.owner = player;
                    logEvent(`${player.team.abbr} - ${player.name} topu kaptı!`);
                }
            } else if (!ball.owner) {
                ball.owner = player;
                logEvent(`${player.team.abbr} - ${player.name} topu kontrol altına aldı.`);
            }
        }
    } else {
        // Top kendisindeyse: Pas atma veya sürme kararı (Çok basit karar)
        
        // Topu oyuncuyla birlikte hareket ettir
        ball.x = player.x;
        ball.y = player.y;

        // Pas Kararı (Rastgele veya hedefe göre)
        if (Math.random() < 0.005) { // Her karede %0.5 pas şansı
             // En yakın takım arkadaşını bul ve ona pas at (Geliştirilecek)
             const teamMates = player.team.players.filter(p => p !== player);
             const targetPlayer = teamMates[Math.floor(Math.random() * teamMates.length)];
             
             if(targetPlayer) {
                 passBall(player, targetPlayer);
             }
        }
    }

    // Saha sınırlarında tut
    player.x = Math.max(PLAYER_SIZE, Math.min(PITCH_WIDTH - PLAYER_SIZE, player.x));
    player.y = Math.max(PLAYER_SIZE, Math.min(PITCH_HEIGHT - PLAYER_SIZE, player.y));
}

// Topu serbest bırakır ve belirlenen hedefe doğru hız verir (PAS)
function passBall(passer, target) {
    logEvent(`${passer.team.abbr} - ${passer.name} pas attı -> ${target.name}`);
    
    // Topu serbest bırak
    ball.owner = null; 

    // Hedefe doğru vektör hesapla
    const dx = target.x - passer.x;
    const dy = target.y - passer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Pas gücü (yetenek ve mesafe ile orantılı)
    const passPower = 5 * (passer.skills.passing / 100); 

    // Topa hız vektörünü uygula (ball objesine vx, vy eklememiz gerekir)
    ball.vx = (dx / distance) * passPower;
    ball.vy = (dy / distance) * passPower;
}

// Topun hareketini ve çarpışmasını yönetir
function handleBallLogic() {
    if (ball.owner) return; // Topun sahibi varsa hareket etmez

    // Topu hareket ettir
    ball.x += ball.vx || 0;
    ball.y += ball.vy || 0;

    // Sürtünme (Top yavaşlar)
    ball.vx *= 0.98;
    ball.vy *= 0.98;

    // Duvar Çarpışması (Taç/Korner/Gol)
    if (ball.x < BALL_SIZE || ball.x > PITCH_WIDTH - BALL_SIZE) {
        // Taç
        logEvent("Taç Atışı!");
        ball.vx = 0; // Topu durdur
        ball.vy = 0;
        // ... Taç atışı mantığı eklenecek ...
    }
    if (ball.y < BALL_SIZE || ball.y > PITCH_HEIGHT - BALL_SIZE) {
         // Gol veya aut (Geliştirilecek)
         // Şu an sadece yansıt
         ball.vy *= -1;
    }
}


// Gol kontrolü (Basit - kale direkleri yok)
function checkGoal() {
    const goalZoneSize = 10; 
    
    // Üst Kale (rakip kale)
    if (ball.y < goalZoneSize && ball.x > PITCH_WIDTH / 3 && ball.x < PITCH_WIDTH * 2 / 3) {
        logEvent("GOOOOOOL! " + userTeam.name + " gol attı!");
        resetMatch();
        // home-score güncellemesi (Geliştirilecek)
    }

    // Alt Kale (kendi kalemiz)
    if (ball.y > PITCH_HEIGHT - goalZoneSize && ball.x > PITCH_WIDTH / 3 && ball.x < PITCH_WIDTH * 2 / 3) {
        logEvent("GOOOOOOL! " + opponentTeam.name + " gol attı!");
        resetMatch();
        // away-score güncellemesi (Geliştirilecek)
    }
}

// Gol sonrası veya devre arası maçı sıfırla
function resetMatch() {
    gameState = 'STOPPED';
    ball.owner = null;
    ball.x = PITCH_WIDTH / 2;
    ball.y = PITCH_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
    
    // Kısa bir süre sonra santrayla tekrar başlat
    setTimeout(() => {
        logEvent("Santra!");
        gameState = 'RUNNING';
    }, 3000);
}

// Maç günlüğüne olay yazar
function logEvent(text) {
    const p = document.createElement('p');
    p.textContent = `[${formatTime(matchTime)}] ${text}`;
    gameLog.prepend(p);
    // En fazla 100 olay tut
    while (gameLog.children.length > 100) {
        gameLog.removeChild(gameLog.lastChild);
    }
}

// Zamanı MM:SS formatına çevirir
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
