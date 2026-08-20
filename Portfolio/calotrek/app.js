/**
 * CaloTrek - Smarter Kalorientracker
 * Dieses Skript verwaltet die Eingaben, Berechnungen und das Speichern im Browser.
 */

// ==========================================================
// 1. ZENTRALER ZUSTAND DER APP (STATE)
// Hier merken wir uns alle aktuellen Daten im Arbeitsspeicher
// ==========================================================
let state = {
    weight: 75,       // Standard-Gewicht in kg
    goal: 'bulk',     // Standard-Ziel: 'cut', 'hold' oder 'bulk'
    targets: {        // Die errechneten Zielwerte für den Tag
        kcal: 2550, 
        protein: 150, 
        carbs: 319, 
        fats: 75 
    },
    meals: []         // Array für alle eingetragenen Mahlzeiten
};

// ==========================================================
// 2. HTML-ELEMENTE AUS DEM DOM GREIFEN
// Wir verknüpfen unsere JavaScript-Variablen mit den HTML-Tags
// ==========================================================
const goalForm = document.getElementById('goalForm');
const entryForm = document.getElementById('entryForm');
const resetBtn = document.getElementById('resetBtn');
const foodList = document.getElementById('foodList');

// ==========================================================
// 3. EVENT-LISTENER & INITIALISIERUNG
// Wird automatisch ausgeführt, sobald die Webseite komplett geladen ist
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Daten aus dem LocalStorage des Browsers laden
    loadFromLocalStorage();

    // 2. Das UI mit den geladenen Daten sofort zeichnen
    renderApp();

    // ------------------------------------------------------
    // EVENT: TAGESZIEL FORMULAR WIRD ABGESENDET
    // ------------------------------------------------------
    goalForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Verhindert das Neuladen der Seite

        // Werte aus den Eingabefeldern holen und in Zahlen umwandeln
        state.weight = Number(document.getElementById('weight').value);
        state.goal = document.getElementById('goal').value;

        // Neue Ziele berechnen
        calculateTargets();

        // Im Browser-Speicher sichern
        saveToLocalStorage();

        // Anzeige auf dem Bildschirm aktualisieren
        renderApp();
    });

    // ------------------------------------------------------
    // EVENT: NEUE MAHLZEIT WIRD HINZUGEFÜGT
    // ------------------------------------------------------
    entryForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Verhindert das Neuladen der Seite
        
        // Neues Mahlzeiten-Objekt erstellen
        const newMeal = {
            id: Date.now(), // Eindeutige ID anhand des aktuellen Zeitstempels
            name: document.getElementById('foodName').value,
            kcal: Number(document.getElementById('foodKcal').value) || 0,
            protein: Number(document.getElementById('foodProtein').value) || 0,
            carbs: Number(document.getElementById('foodCarbs').value) || 0,
            fats: Number(document.getElementById('foodFats').value) || 0
        };

        // Mahlzeit in unser Array schieben
        state.meals.push(newMeal);

        // Speichern und UI neu zeichnen
        saveToLocalStorage();
        renderApp();

        // Das Formular für die nächste Eingabe leeren
        entryForm.reset();
    });

    // ------------------------------------------------------
    // EVENT: TAG ZURÜCKSETZEN (ALLE MAHLZEITEN LÖSCHEN)
    // ------------------------------------------------------
    resetBtn.addEventListener('click', () => {
        // Sicherheitsabfrage im Browser
        if (confirm('Möchtest du alle Mahlzeiten für heute zurücksetzen?')) {
            state.meals = []; // Mahlzeiten-Liste leeren
            saveToLocalStorage();
            renderApp();
        }
    });
});

// ==========================================================
// 4. BERECHNUNGSLOGIK FÜR DIE ZIELWERTE
// ==========================================================
function calculateTargets() {
    // Grundberechnung: 30 kcal pro kg Körpergewicht als Basisbedarf
    let totalKcal = state.weight * 30;

    // Kalorien je nach Ziel anpassen
    if (state.goal === 'cut') totalKcal -= 500;  // 500 kcal Defizit zum Fettabbau
    if (state.goal === 'bulk') totalKcal += 300; // 300 kcal Überschuss für Muskelaufbau

    // Makronährstoff-Verteilung:
    // - Protein: 2g pro kg Körpergewicht (1g Protein = 4 kcal)
    // - Fett: 1g pro kg Körpergewicht (1g Fett = 9 kcal)
    // - Kohlenhydrate: Alle verbleibenden Kalorien (1g Kohlenhydrate = 4 kcal)
    const protein = Math.round(state.weight * 2);
    const fats = Math.round(state.weight * 1);
    const usedKcal = (protein * 4) + (fats * 9);
    const carbs = Math.max(0, Math.round((totalKcal - usedKcal) / 4));

    // Neue Zielwerte im State speichern
    state.targets = { kcal: totalKcal, protein, carbs, fats };
}

// ==========================================================
// 5. UI-RENDERING (BILDCHIRM AKTUALISIEREN)
// ==========================================================
function renderApp() {
    // 1. Eingabefelder für Ziel mit aktuellen Werten vorbelegen
    document.getElementById('weight').value = state.weight;
    document.getElementById('goal').value = state.goal;

    // 2. Summe aller gegessenen Kalorien und Makros zusammenzählen (.reduce)
    const consumed = state.meals.reduce((acc, m) => {
        acc.kcal += m.kcal;
        acc.protein += m.protein;
        acc.carbs += m.carbs;
        acc.fats += m.fats;
        return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fats: 0 });

    // 3. Verbleibende Restwerte berechnen (Ziel minus Gegessen)
    const remainingKcal = state.targets.kcal - consumed.kcal;
    const remainingProtein = state.targets.protein - consumed.protein;
    const remainingCarbs = state.targets.carbs - consumed.carbs;
    const remainingFats = state.targets.fats - consumed.fats;

    // 4. Werte in die HTML-Kacheln schreiben
    document.getElementById('targetKcal').textContent = state.targets.kcal;
    document.getElementById('remainingKcal').textContent = remainingKcal;
    document.getElementById('targetProtein').textContent = state.targets.protein;
    document.getElementById('remainingProtein').textContent = `${remainingProtein} g`;
    document.getElementById('targetCarbs').textContent = state.targets.carbs;
    document.getElementById('remainingCarbs').textContent = `${remainingCarbs} g`;
    document.getElementById('targetFats').textContent = state.targets.fats;
    document.getElementById('remainingFats').textContent = `${remainingFats} g`;

    // 5. Mahlzeiten-Liste komplett neu aufbauen
    foodList.innerHTML = '';
    
    if (state.meals.length === 0) {
        // Hinweis anzeigen, wenn noch nichts eingetragen wurde
        foodList.innerHTML = '<li style="color:#64748b; font-size:0.85rem; text-align:center; padding:10px;">Noch keine Mahlzeiten eingetragen.</li>';
    } else {
        // Für jede Mahlzeit ein <li> Listenelement erzeugen
        state.meals.forEach(meal => {
            const li = document.createElement('li');
            li.className = 'food-item';
            li.innerHTML = `
                <div class="food-details">
                    <span class="food-title">${meal.name}</span>
                    <span class="food-macros">${meal.kcal} kcal | P: ${meal.protein}g | C: ${meal.carbs}g | F: ${meal.fats}g</span>
                </div>
                <!-- Löschen-Button für diesen einzelnen Eintrag -->
                <button class="delete-btn" onclick="deleteMeal(${meal.id})" title="Löschen">✕</button>
            `;
            foodList.appendChild(li);
        });
    }
}

// ==========================================================
// 6. EINZELNE MAHLZEIT LÖSCHEN
// ==========================================================
window.deleteMeal = function(id) {
    // Behält alle Mahlzeiten im Array, AUSSER die mit der gelöschten ID
    state.meals = state.meals.filter(m => m.id !== id);
    saveToLocalStorage();
    renderApp();
};

// ==========================================================
// 7. LOKALE SPEICHERUNG (LOCALSTORAGE)
// ==========================================================

// Speichert das JavaScript-Objekt als JSON-Text im Browser
function saveToLocalStorage() {
    localStorage.setItem('calotrek_tracker_state', JSON.stringify(state));
}

// Lädt den JSON-Text aus dem Browser und wandelt ihn wieder in ein Objekt um
function loadFromLocalStorage() {
    const saved = localStorage.getItem('calotrek_tracker_state');
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error('Fehler beim Laden der gespeicherten Daten:', e);
        }
    } else {
        // Falls noch keine Daten existieren, Standardziele einmalig berechnen
        calculateTargets();
    }
}