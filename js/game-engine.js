const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gameLog = document.getElementById('game-log');

let userTeam = null;
let opponentTeam = null;
let ball = { x: canvas.width / 2, y: canvas.height / 2, owner: null, vx: 0, vy: 0 };
let matchTime = 0; 
let gameState = 'STOPPED'; // STOPPED, RUNNING, PAUSED

// Sabitler
const PITCH_WIDTH = canvas.width;
const PITCH_HEIGHT = canvas.height;
const PLAYER_SIZE = 15;
const BALL_SIZE = 5;

// --- Oyuncu/Takım Verisi ---

function createOpponentTeam() {
    return {
        name: "Güçlü Rakip FC",
        abbr: "GRC",
        logoId: 'L_OPP',
        players: generateDefaultPlayers().map(p => ({
            ...p,
            name: `Rakip ${p.number}`,
            // Rakip oyuncuların yeteneklerini biraz düzenleyelim
            overall: Math.max(55, p.overall - Math.floor(Math.random() * 5)) 
        })),
        isUserTeam: false
    };
}

// --- Oyun Başlatma ---
function startGame(teamData) {
    userTeam = teamData;
    opponentTeam = createOpponentTeam(); 

    // Arayüzü Güncelle
    document.getElementById('user-team-name').textContent = userTeam.name;
    document.getElementById('money-display').textContent = '₿ ' + userTeam.money.toLocaleString('tr-TR');
    document.getElementById('home-team-abbr').textContent = userTeam.abbr;
    document.getElementById('away-team-abbr').textContent = opponentTeam.abbr;

    // Oyuncuların başlangıç pozisyonlarını ayarla
    setupPlayerPositions(userTeam.players, true);
    setupPlayerPositions(opponentTeam.players, false);

    // Tüm ekranları gizle ve oyun ekranını göster
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById('game-screen').classList.add('active');
    
    // Maç Ayarları
    matchTime = 0;
    gameState = 'RUNNING'; // Otomatik olarak maçı başlat
    
    logEvent("Maç Başladı! " + userTeam.name + " vs " + opponentTeam.name);
    gameLoop();
}


// Oyuncuların sahada başlangıç pozisyonlarını ayarlar (Basit 4-4-2)
function setupPlayerPositions(players, isHomeTeam) {
    // Saha Y ve X katsayıları
    const Y_DEF = isHomeTeam ? 0.8 : 0.2;
    const Y_MID = isHomeTeam ? 0.5 : 0.5;
    const Y_ATT = isHomeTeam ? 0.2 : 0.8;
    const Y_GK = isHomeTeam ? 0.95 : 0.05;

    const xPos = [0.2, 0.4, 0.6, 0.8]; // Defans ve Orta saha için x pozisyonları
    const xAtt = [0.4, 0.6]; // Forvet için x pozisyonları

    const offsetX = isHomeTeam ? 0 : 0; // Takımları ayırmak için kullanılabilir.

    let defCount = 0;
    let midCount = 0;
    let attCount = 0;

    players.forEach(p => {
        let x, y;

        switch (p.position) {
            case 'GK':
                x = PITCH_WIDTH / 2;
                y = PITCH_HEIGHT * Y_GK;
                break;
            case 'DEF':
                x = PITCH_WIDTH * xPos[defCount++ % 4] + offsetX;
                y = PITCH_HEIGHT * Y_DEF;
                break;
            case 'MID':
                x = PITCH_WIDTH * xPos[midCount++ % 4] + offsetX;
                y = PITCH_HEIGHT * Y_MID;
                break;
            case 'ATT':
                x = PITCH_WIDTH * xAtt[attCount++ % 2] + offsetX;
                y = PITCH_HEIGHT * Y_ATT;
                break;
        }

        p.x = x;
        p.y = y;
        p.initialX = x; // Pozisyon koruma için başlangıç noktası
        p.initialY = y;
        p.team = isHomeTeam ? userTeam : opponentTeam;
    });
}

// --- Oyun Döngüsü ---
function gameLoop() {
    if (gameState !== 'RUNNING') return;

    updateGameLogic();
    drawGame();

    // 60 FPS
    requestAnimationFrame(gameLoop);
}

// --- Maç Mantığı (Her Karede Çalışır) ---
function updateGameLogic() {
    // Zamanı Güncelle
    matchTime += 1 / 60; 
    document.getElementById('match-time').textContent = formatTime(matchTime);

    // Oyuncuları ve Topu hareket ettir
    [...userTeam.players, ...opponentTeam.players].forEach(player => {
        handlePlayerMovement(player);
    });

    handleBallLogic();
    checkGoal();
}


// Oyuncu hareketini yönetir (Pozisyon Korumalı Basit AI)
function handlePlayerMovement(player) {
    const speed = 0.5 + (player.overall / 200); 
    const isHome = player.team === userTeam;
    
    let targetX, targetY;
    
    // 1. Topa Sahipse (Dribbling)
    if (ball.owner === player) {
        // En yakın rakip kaleye doğru hareket et
        targetX = PITCH_WIDTH / 2 + (isHome ? 0 : 0); // Şimdilik ortada tut
        targetY = PITCH_HEIGHT * (isHome ? 0.05 : 0.95); // Rakip kale çizgisi
        
        // Çok yakına gelmişse pas veya şut atma kararı
        const distanceToGoal = Math.sqrt(Math.pow(player.x - targetX, 2) + Math.pow(player.y - targetY, 2));
        if (distanceToGoal < 150 && Math.random() < 0.01) {
            // Şut Çek! (Geliştirilecek)
            logEvent(`${player.team.abbr} - ${player.name} Şut Çekti!`);
            shootBall(player, PITCH_WIDTH / 2, targetY);
            return;
        } 
        
        // Topu oyuncuyla birlikte hareket ettir
        ball.x = player.x;
        ball.y = player.y;

        // Pas Kararı (Rastgele)
        if (Math.random() < 0.005) { 
             const teamMates = player.team.players.filter(p => p !== player);
             // En yakın takım arkadaşını bul (Basit bir hedef seçimi)
             const targetPlayer = teamMates.reduce((best, current) => {
                 const dist = Math.sqrt(Math.pow(current.x - player.x, 2) + Math.pow(current.y - player.y, 2));
                 if (dist < best.distance) {
                     return { player: current, distance: dist };
                 }
                 return best;
             }, { player: null, distance: 9999 }).player;

             if(targetPlayer) {
                 passBall(player, targetPlayer);
                 return;
             }
        }

    } 
    // 2. Topu Kovala veya Pozisyon Koru
    else {
        const distanceToBall = Math.sqrt(Math.pow(ball.x - player.x, 2) + Math.pow(ball.y - player.y, 2));
        
        if (distanceToBall < 200) {
            // Topa yakınsa, topu kovalar
            targetX = ball.x;
            targetY = ball.y;
        } else {
            // Top uzaktaysa, pozisyonunu korumaya döner
            targetX = player.initialX;
            targetY = player.initialY;
        }
        
        // Top Çalma (Hafifçe dokunarak topu alma)
        if (distanceToBall < PLAYER_SIZE + BALL_SIZE && ball.owner && ball.owner.team !== player.team) {
            const stealChance = (player.skills.defending * 1.5 - ball.owner.skills.dribbling) / 100;
            if (Math.random() < 0.02 + (stealChance * 0.05)) { 
                ball.owner = player;
                ball.vx = 0; ball.vy = 0; // Topu durdur
                logEvent(`${player.team.abbr} - ${player.name} Topu Kaptı!`);
            }
        }
    }

    // Hedefe Doğru Hareket (Vektör Hesaplama)
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {
        player.x += (dx / distance) * speed;
        player.y += (dy / distance) * speed;
    }

    // Saha sınırlarında tut
    player.x = Math.max(PLAYER_SIZE, Math.min(PITCH_WIDTH - PLAYER_SIZE, player.x));
    player.y = Math.max(PLAYER_SIZE, Math.min(PITCH_HEIGHT - PLAYER_SIZE, player.y));
}

// Topu paslar
function passBall(passer, target) {
    logEvent(`${passer.team.abbr} - ${passer.name} Pas Attı -> ${target.name}`);
    
    ball.owner = null; 

    // Hedefe doğru vektör hesapla
    const dx = target.x - passer.x;
    const dy = target.y - passer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Pas gücü (yetenek ve mesafe ile orantılı)
    const passPower = 6 * (passer.skills.passing / 100) * 1.5; // Daha hızlı pas

    // Topa hız vektörünü uygula
    ball.vx = (dx / distance) * passPower;
    ball.vy = (dy / distance) * passPower;
    
    // Pas isabeti için ufak bir hata payı ekle (Pas yeteneği düşükse daha büyük hata)
    const inaccuracy = 0.5 * (100 - passer.skills.passing) / 100;
    ball.vx += (Math.random() - 0.5) * inaccuracy;
    ball.vy += (Math.random() - 0.5) * inaccuracy;
}

// Topu şutlar
function shootBall(shooter, targetX, targetY) {
    logEvent(`${shooter.team.abbr} - ${shooter.name} Şuuuut!`);
    
    ball.owner = null; 

    const dx = targetX - shooter.x;
    const dy = targetY - shooter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Şut gücü (daha yüksek hız)
    const shootPower = 8 * (shooter.skills.shooting / 100); 

    ball.vx = (dx / distance) * shootPower;
    ball.vy = (dy / distance) * shootPower;

    // Şut isabeti için hata payı ekle
    const inaccuracy = 1 * (100 - shooter.skills.shooting) / 100;
    ball.vx += (Math.random() - 0.5) * inaccuracy * 2;
    ball.vy += (Math.random() - 0.5) * inaccuracy * 2;
}

// Topun hareketini ve çarpışmasını yönetir
function handleBallLogic() {
    if (ball.owner) return; 

    // Topu hareket ettir
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Sürtünme (Top yavaşlar)
    ball.vx *= 0.985;
    ball.vy *= 0.985;

    // Çarpışma ve Taç/Korner Kontrolü
    
    // Yatay sınırlar (Taç atışı)
    if (ball.x < BALL_SIZE || ball.x > PITCH_WIDTH - BALL_SIZE) {
        logEvent("Taç Atışı!");
        ball.vx = 0; 
        ball.vy = 0;
        // Topu sınırda tut
        ball.x = Math.max(BALL_SIZE, Math.min(PITCH_WIDTH - BALL_SIZE, ball.x));
        // Taç atan takımı belirle (Geliştirilecek)
    }
    
    // Dikey sınırlar (Gol Kontrolü bu fonksiyonun dışında)
    if (ball.y < BALL_SIZE || ball.y > PITCH_HEIGHT - BALL_SIZE) {
         // Kale alanı dışında ise Korner/Aut
         // Şu an sadece yansıtma (Geliştirilecek: Korner/Aut/Gol)
         ball.vy *= -0.5; // Biraz enerji kaybeterek yansıt
    }
}

// Gol kontrolü
function checkGoal() {
    const goalZoneY = 20; 
    const goalWidthStart = PITCH_WIDTH / 3;
    const goalWidthEnd = PITCH_WIDTH * 2 / 3;
    
    // Gol var mı? (Top kale aralığında ve çizginin arkasında mı?)

    // Üst Kale (Rakip Kale)
    if (ball.y < 0 && ball.x > goalWidthStart && ball.x < goalWidthEnd) {
        logEvent("⚽ GOL! " + userTeam.name + " Skor Yaptı!");
        // Gol sayacını artır (Geliştirilecek)
        document.getElementById('home-score').textContent = parseInt(document.getElementById('home-score').textContent) + 1;
        resetMatch();
        return;
    }

    // Alt Kale (Kendi Kalemiz)
    if (ball.y > PITCH_HEIGHT && ball.x > goalWidthStart && ball.x < goalWidthEnd) {
        logEvent("⚽ GOL! " + opponentTeam.name + " Gol Attı!");
        // Gol sayacını artır (Geliştirilecek)
        document.getElementById('away-score').textContent = parseInt(document.getElementById('away-score').textContent) + 1;
        resetMatch();
        return;
    }
}

// Gol sonrası maçı sıfırla
function resetMatch() {
    gameState = 'STOPPED';
    ball.owner = null;
    ball.x = PITCH_WIDTH / 2;
    ball.y = PITCH_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
    
    // Oyuncuları başlangıç pozisyonlarına geri gönder (Daha sonra santra vuruşu atayarak geliştirilecek)
    setupPlayerPositions(userTeam.players, true);
    setupPlayerPositions(opponentTeam.players, false);

    // Kısa bir süre sonra santrayla tekrar başlat
    setTimeout(() => {
        logEvent("Santra Vuruşu Başlıyor!");
        gameState = 'RUNNING';
    }, 3000);
}

// Diğer Yardımcı Fonksiyonlar... (drawGame, drawPlayer, drawBall, logEvent, formatTime)

// --- Çizim (Rendering) ---
function drawGame() {
    // Sahayı Temizle
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT);
    
    // Çizgileri çiz
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    
    ctx.strokeRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT); // Dış Çizgiler
    
    // Orta Çizgi
    ctx.beginPath();
    ctx.moveTo(PITCH_WIDTH / 2, 0);
    ctx.lineTo(PITCH_WIDTH / 2, PITCH_HEIGHT); 
    ctx.stroke();

    // Orta Saha Dairesi
    ctx.beginPath();
    ctx.arc(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
    
    // Kale Alanları (Basitleştirilmiş)
    // Üst kale alanı
    ctx.strokeRect(PITCH_WIDTH / 4, 0, PITCH_WIDTH / 2, 100);
    // Alt kale alanı
    ctx.strokeRect(PITCH_WIDTH / 4, PITCH_HEIGHT - 100, PITCH_WIDTH / 2, 100);

    // Oyuncuları çiz
    [...userTeam.players, ...opponentTeam.players].forEach(player => {
        drawPlayer(player, player.team === userTeam ? '#3498db' : '#e74c3c'); // Mavi vs Kırmızı
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

// Maç günlüğüne olay yazar
function logEvent(text) {
    const p = document.createElement('p');
    p.textContent = `[${formatTime(matchTime)}] ${text}`;
    gameLog.prepend(p);
    // En fazla 50 olay tut
    while (gameLog.children.length > 50) {
        gameLog.removeChild(gameLog.lastChild);
    }
}

// Zamanı MM:SS formatına çevirir
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
