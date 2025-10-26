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
    logoContainer.innerHTML = ''; // İçeriği temizle

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

    const teamName = document.getElementById('team-name').value.trim();
    const teamAbbr = document.getElementById('team-abbr').value.toUpperCase().trim();
    const presidentName = document.getElementById('president-name').value.trim();

    // Butonu devre dışı bırak
    const submitBtn = this.querySelector('.submit-button');
    submitBtn.textContent = 'Kuruluyor...';
    submitBtn.disabled = true;


    const newTeamData = {
        name: teamName,
        abbr: teamAbbr,
        president: presidentName,
        logoId: selectedLogoId,
        money: 1000000, 
        players: generateDefaultPlayers(),
        isUserTeam: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // Firebase'e kaydetme
        await db.collection("teams").doc(USER_TEAM_DOC).set(newTeamData);
        console.log("Takım başarıyla kaydedildi!");

        // Ekranı değiştir ve oyunu başlat (firebase-config.js'deki fonksiyon)
        document.getElementById('team-creation-screen').classList.remove('active');
        startGame(newTeamData); // <--- startGame çağrısı!

    } catch (error) {
        console.error("Takım kaydı sırasında hata:", error);
        alert("Takım kaydedilemedi: " + error.message);
        submitBtn.textContent = 'Kulübü Kur ve Yönetime Başla';
        submitBtn.disabled = false;
    }
});

// Oyuncu Yeteneklerini Üretme Fonksiyonu (team-creation.js içinde tutuldu)
function generateDefaultPlayers() {
    const positions = {
        GK: 1, DEF: 4, MID: 4, ATT: 2
    };
    
    let players = [];
    let number = 1;

    for (const pos in positions) {
        for (let i = 0; i < positions[pos]; i++) {
            // Yetenekler (50-100 arası rastgele)
            const passing = Math.floor(Math.random() * 50) + 50;
            const shooting = Math.floor(Math.random() * 50) + 50;
            const dribbling = Math.floor(Math.random() * 50) + 50;
            const defending = Math.floor(Math.random() * 50) + 50;
            
            let overall;
            if (pos === 'GK') {
                overall = Math.round((defending + 75) / 2); // GK için daha basit ortalama
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
                condition: 100
            });
            number++;
        }
    }
    return players;
}

// Sayfa yüklendiğinde logoları yükle
document.addEventListener('DOMContentLoaded', loadLogos);
