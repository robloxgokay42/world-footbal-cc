// Hazır logolar (basit renk ve metin temsili)
const logos = [
    { id: 'L1', color: '#e74c3c', text: 'KRM' }, // Kırmızı
    { id: 'L2', color: '#3498db', text: 'MAV' }, // Mavi
    { id: 'L3', color: '#2ecc71', text: 'YŞL' }, // Yeşil
    { id: 'L4', color: '#f1c40f', text: 'SRI' }, // Sarı
    { id: 'L5', color: '#9b59b6', text: 'MOR' }  // Mor
];

let selectedLogoId = logos[0].id; // Varsayılan olarak ilk logoyu seç

// Logoları HTML'e yükle
function loadLogos() {
    const logoContainer = document.getElementById('logo-selection');
    logoContainer.innerHTML = '<h2>Logo Seç</h2>';

    logos.forEach(logo => {
        const div = document.createElement('div');
        div.className = 'logo-option';
        div.id = `logo-${logo.id}`;
        div.style.backgroundColor = logo.color;
        div.innerText = logo.text;
        div.dataset.logoId = logo.id;

        // Tıklama olayı
        div.addEventListener('click', () => {
            document.querySelectorAll('.logo-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedLogoId = logo.id;
        });

        logoContainer.appendChild(div);
    });

    // İlk logoyu varsayılan olarak seç
    document.getElementById(`logo-${selectedLogoId}`).classList.add('selected');
}

// Takım Formu Gönderme Olayı
document.getElementById('team-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const teamName = document.getElementById('team-name').value;
    const teamAbbr = document.getElementById('team-abbr').value.toUpperCase();
    const presidentName = document.getElementById('president-name').value;

    const newTeamData = {
        name: teamName,
        abbr: teamAbbr,
        president: presidentName,
        logoId: selectedLogoId,
        money: 1000000, // Başlangıç parası
        players: generateDefaultPlayers(), // Oyuncu listesini oluştur
        isUserTeam: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // Firebase'e kaydetme
        await db.collection("teams").doc(USER_TEAM_DOC).set(newTeamData);
        console.log("Takım başarıyla kaydedildi!");

        // Ekranı değiştir ve oyunu başlat
        document.getElementById('team-creation-screen').classList.remove('active');
        startGame(newTeamData);

    } catch (error) {
        console.error("Takım kaydı sırasında hata:", error);
        alert("Takım kaydedilemedi: " + error.message);
    }
});

// Sayfa yüklendiğinde logoları yükle
document.addEventListener('DOMContentLoaded', loadLogos);


/**
 * TEMEL OYUNCU OLUŞTURMA FONKSİYONU
 * Her oyuncunun yetenekleri (pas, şut, dribbling) rastgele atanır.
 */
function generateDefaultPlayers() {
    const positions = {
        GK: 1, // Kaleci
        DEF: 4, // Defans
        MID: 4, // Orta Saha
        ATT: 2  // Forvet
    };
    
    let players = [];
    let number = 1;

    for (const pos in positions) {
        for (let i = 0; i < positions[pos]; i++) {
            // Yetenekler (0-100 arası rastgele)
            const passing = Math.floor(Math.random() * 50) + 50; // 50-100
            const shooting = Math.floor(Math.random() * 50) + 50;
            const dribbling = Math.floor(Math.random() * 50) + 50;
            const defending = Math.floor(Math.random() * 50) + 50;
            
            // Ortalama Güç (Basit bir ortalama)
            let overall;
            if (pos === 'GK') {
                overall = Math.round((defending + passing) / 2);
            } else {
                overall = Math.round((passing + shooting + dribbling + defending) / 4);
            }

            players.push({
                id: `P${number}`,
                name: `Oyuncu ${number}`,
                number: number,
                position: pos,
                overall: overall,
                skills: { passing, shooting, dribbling, defending },
                condition: 100 // maç öncesi kondisyon
            });
            number++;
        }
    }
    return players;
}
