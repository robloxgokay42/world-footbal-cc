// Hazır logolar (Aynı kaldı)
const logos = [
    { id: 'L1', color: '#e74c3c', text: 'KRM' }, 
    { id: 'L2', color: '#3498db', text: 'MAV' }, 
    { id: 'L3', color: '#2ecc71', text: 'YŞL' }, 
    { id: 'L4', color: '#f1c40f', text: 'SRI' }, 
    { id: 'L5', color: '#9b59b6', text: 'MOR' }  
];

let selectedLogoId = logos[0].id; 

// Logoları HTML'e yükle (Aynı kaldı)
function loadLogos() {
    const logoContainer = document.getElementById('logo-selection');
    logoContainer.innerHTML = ''; 

    logos.forEach(logo => {
        const div = document.createElement('div');
        div.className = 'logo-option';
        div.id = `logo-${logo.id}`;
        div.style.backgroundColor = logo.color;
        div.innerText = logo.text;
        div.dataset.logoId = logo.id;

        div.addEventListener('click', () => {
            document.querySelectorAll('.logo-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedLogoId = logo.id;
        });

        logoContainer.appendChild(div);
    });

    document.getElementById(`logo-${selectedLogoId}`).classList.add('selected');
}

// Takım Formu Gönderme Olayı
document.getElementById('team-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const teamName = document.getElementById('team-name').value.trim();
    const teamAbbr = document.getElementById('team-abbr').value.toUpperCase().trim();
    const presidentName = document.getElementById('president-name').value.trim();

    const submitBtn = this.querySelector('.submit-button');
    submitBtn.textContent = 'Kuruluyor...';
    submitBtn.disabled = true;

    // Oyuncuların yetenekleri ve durumları burada belirlenir
    const players = generateDefaultPlayers();

    const newTeamData = {
        name: teamName,
        abbr: teamAbbr,
        president: presidentName,
        logoId: selectedLogoId,
        money: 1000000, 
        currentYear: 1, // Yeni Eklendi
        currentWeek: 1, // Yeni Eklendi
        players: players,
        isUserTeam: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("teams").doc(USER_TEAM_DOC).set(newTeamData);
        console.log("Takım başarıyla kaydedildi!");

        document.getElementById('team-creation-screen').classList.remove('active');
        startGame(newTeamData); // Yönetim ekranına geçişi tetikler

    } catch (error) {
        console.error("Takım kaydı sırasında hata:", error);
        alert("Takım kaydedilemedi: " + error.message);
        submitBtn.textContent = 'Kulübü Kur ve Yönetime Başla';
        submitBtn.disabled = false;
    }
});

// Oyuncu Yeteneklerini Üretme Fonksiyonu (Yorgunluk ekledim)
function generateDefaultPlayers() {
    const positions = { GK: 1, DEF: 4, MID: 4, ATT: 2 };
    let players = [];
    let number = 1;

    for (const pos in positions) {
        for (let i = 0; i < positions[pos]; i++) {
            const passing = Math.floor(Math.random() * 50) + 50; 
            const shooting = Math.floor(Math.random() * 50) + 50;
            const dribbling = Math.floor(Math.random() * 50) + 50;
            const defending = Math.floor(Math.random() * 50) + 50;
            
            let overall;
            if (pos === 'GK') { overall = Math.round((defending + 75) / 2); } 
            else { overall = Math.round((passing + shooting + dribbling + defending) / 4); }

            players.push({
                id: `P${number}`,
                name: `Oyuncu ${number}`,
                number: number,
                position: pos,
                overall: overall,
                skills: { passing, shooting, dribbling, defending },
                condition: 100, // Maç öncesi kondisyon (Yorulma seviyesi)
                isInjured: false, // Yeni Eklendi
                cardStatus: null // Yeni Eklendi (Sarı/Kırmızı)
            });
            number++;
        }
    }
    return players;
}

document.addEventListener('DOMContentLoaded', loadLogos);
