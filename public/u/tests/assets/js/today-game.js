// today-game.js - 꿈의 정원 가꾸기 (Dream Garden Tending)

// --- Utility Functions ---
function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function getRandomValue(base, variance) {
    const min = base - variance;
    const max = base + variance;
    return Math.floor(currentRandFn() * (max - min + 1)) + min;
}

function getEulReParticle(word) {
    if (!word || word.length === 0) return "를";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "와";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        creativity: 50, // 창의성
        passion: 50,    // 열정
        authenticity: 50, // 진정성
        inspiration: 50,  // 영감
        empathy: 50,      // 공감
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { dream_shards: 10, emotion_drops: 10, imagination_seeds: 5, starlight: 0 },
        spirits: [
            { id: "lyra", name: "리라", personality: "수줍은", skill: "이야기", communion: 70 },
            { id: "noa", name: "노아", personality: "따뜻한", skill: "음악", communion: 60 }
        ],
        maxSpirits: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { creationSuccess: 0 },
        dailyActions: { daydreamed: false, concertHeld: false, communedWith: [], minigamePlayed: false },
        gardenElements: {
            fountainOfIdeas: { built: false, durability: 100, name: "아이디어의 샘", description: "샘솟는 아이디어로 정원을 풍요롭게 합니다.", effect_description: "창의성 보너스 및 꿈 조각 자동 획득." },
            forestOfEmotions: { built: false, durability: 100, name: "감정의 숲", description: "다양한 감정을 느끼고 표현하는 법을 배웁니다.", effect_description: "공감 능력 향상 및 감정의 물방울 생성." },
            altarOfValues: { built: false, durability: 100, name: "가치의 제단", description: "내면의 신념과 가치를 되새기는 공간입니다.", effect_description: "새로운 정령과의 만남 및 진정성 강화." },
            meadowOfComfort: { built: false, durability: 100, name: "위안의 초원", description: "지친 마음을 위로하고 열정을 회복합니다.", effect_description: "과거의 기억을 통해 스탯 및 자원 획득." },
            starlightObservatory: { built: false, durability: 100, name: "별빛 전망대", description: "별빛을 모아 강력한 창작 활동을 합니다.", effect_description: "고급 창작 및 별빛 활용 잠금 해제." }
        },
        artLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('infpDreamGardenGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('infpDreamGardenGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        // Patch for old save files
        if (!loaded.dailyBonus) loaded.dailyBonus = { creationSuccess: 0 };
        if (!loaded.spirits || loaded.spirits.length === 0) {
            loaded.spirits = [
                { id: "lyra", name: "리라", personality: "수줍은", skill: "이야기", communion: 70 },
                { id: "noa", name: "노아", personality: "따뜻한", skill: "음악", communion: 60 }
            ];
        }
        if (!loaded.inspiration) loaded.inspiration = 50;
        if (!loaded.empathy) loaded.empathy = 50;

        Object.assign(gameState, loaded);

        currentRandFn = mulberry32(getDailySeed() + gameState.day);

        if (gameState.lastPlayedDate !== today) {
            gameState.day += 1;
            gameState.lastPlayedDate = today;
            gameState.manualDayAdvances = 0;
            gameState.dailyEventTriggered = false;
            processDailyEvents();
        }
    } else {
        resetGameState();
        processDailyEvents();
    }
    renderAll();
}

function updateState(changes, displayMessage = null) {
    Object.keys(changes).forEach(key => {
        if (typeof changes[key] === 'object' && changes[key] !== null && !Array.isArray(changes[key])) {
            gameState[key] = { ...gameState[key], ...changes[key] };
        } else {
            gameState[key] = changes[key];
        }
    });
    saveGameState();
    renderAll(displayMessage);
}

// --- UI Rendering ---
function updateGameDisplay(text) {
    const gameArea = document.getElementById('gameArea');
    if(gameArea && text) gameArea.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderStats() {
    const statsDiv = document.getElementById('gameStats');
    if (!statsDiv) return;
    const spiritListHtml = gameState.spirits.map(s => `<li>${s.name} (${s.skill}) - 교감: ${s.communion}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>날짜:</b> ${gameState.day}일</p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>창의성:</b> ${gameState.creativity} | <b>열정:</b> ${gameState.passion} | <b>진정성:</b> ${gameState.authenticity} | <b>영감:</b> ${gameState.inspiration} | <b>공감:</b> ${gameState.empathy}</p>
        <p><b>자원:</b> 꿈 조각 ${gameState.resources.dream_shards}, 감정의 물방울 ${gameState.resources.emotion_drops}, 상상의 씨앗 ${gameState.resources.imagination_seeds}, 별빛 ${gameState.resources.starlight || 0}</p>
        <p><b>예술 레벨:</b> ${gameState.artLevel}</p>
        <p><b>함께하는 정령 (${gameState.spirits.length}/${gameState.maxSpirits}):</b></p>
        <ul>${spiritListHtml}</ul>
        <p><b>정원의 요소:</b></p>
        <ul>${Object.values(gameState.gardenElements).filter(e => e.built).map(e => `<li>${e.name} (내구성: ${e.durability}) - ${e.effect_description}</li>`).join('') || '없음'}</ul>
    `;
    const manualDayCounter = document.getElementById('manualDayCounter');
    if(manualDayCounter) manualDayCounter.innerText = gameState.manualDayAdvances;
}

function renderChoices(choices) {
    const choicesDiv = document.getElementById('gameChoices');
    if (!choicesDiv) return;
    let dynamicChoices = [];

    if (gameState.currentScenarioId === 'intro') {
        dynamicChoices = gameScenarios.intro.choices;
    } else if (gameState.currentScenarioId === 'action_element_management') {
        dynamicChoices = gameScenarios.action_element_management.choices ? [...gameScenarios.action_element_management.choices] : [];
        if (!gameState.gardenElements.fountainOfIdeas.built) dynamicChoices.push({ text: "아이디어의 샘 건설 (꿈 조각 50, 감정의 물방울 20)", action: "build_fountainOfIdeas" });
        if (!gameState.gardenElements.forestOfEmotions.built) dynamicChoices.push({ text: "감정의 숲 조성 (감정의 물방울 30, 상상의 씨앗 30)", action: "build_forestOfEmotions" });
        if (!gameState.gardenElements.altarOfValues.built) dynamicChoices.push({ text: "가치의 제단 설립 (꿈 조각 100, 감정의 물방울 50, 상상의 씨앗 50)", action: "build_altarOfValues" });
        if (!gameState.gardenElements.meadowOfComfort.built) dynamicChoices.push({ text: "위안의 초원 조성 (감정의 물방울 80, 상상의 씨앗 40)", action: "build_meadowOfComfort" });
        if (gameState.gardenElements.forestOfEmotions.built && gameState.gardenElements.forestOfEmotions.durability > 0 && !gameState.gardenElements.starlightObservatory.built) {
            dynamicChoices.push({ text: "별빛 전망대 건설 (감정의 물방울 50, 상상의 씨앗 100)", action: "build_starlightObservatory" });
        }
        Object.keys(gameState.gardenElements).forEach(key => {
            const element = gameState.gardenElements[key];
            if (element.built && element.durability < 100) {
                dynamicChoices.push({ text: `${element.name} 정화 (감정의 물방울 10, 상상의 씨앗 10)`, action: "maintain_element", params: { element: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}'>${choice.text}</button>`).join('');
    choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (gameActions[action]) {
                gameActions[action](JSON.parse(button.dataset.params || '{}'));
            }
        });
    });
}

function renderAll(customDisplayMessage = null) {
    const desc = document.getElementById('gameDescription');
    if (desc) desc.style.display = 'none';
    renderStats();
    
    if (!gameState.currentScenarioId.startsWith('minigame_')) {
        const scenario = gameScenarios[gameState.currentScenarioId] || gameScenarios.intro;
        updateGameDisplay(customDisplayMessage || scenario.text);
        renderChoices(scenario.choices);
    }
}

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "오늘은 정원에서 무엇을 할까요?", choices: [
        { text: "몽상하기", action: "daydream" },
        { text: "정령과 교감하기", action: "commune_with_spirits" },
        { text: "작은 음악회 열기", action: "hold_small_concert" },
        { text: "영감 모으기", action: "show_inspiration_gathering_options" },
        { text: "정원 요소 관리", action: "show_element_options" },
        { text: "고요한 사색", action: "show_quiet_contemplation_options" },
        { text: "오늘의 창작 활동", action: "play_minigame" }
    ]},
    // ... (Scenario text to be filled in with INFP theme)
};

// ... (Outcome arrays and other data structures to be filled in)

// ... (Full gameActions object to be implemented)

// ... (Daily logic functions to be implemented)

// --- Initialization ---
window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', () => {
            if (gameState.manualDayAdvances >= 5) {
                updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요.");
                return;
            }
            updateState({
                manualDayAdvances: gameState.manualDayAdvances + 1,
                day: gameState.day + 1,
                lastPlayedDate: new Date().toISOString().slice(0, 10),
                dailyEventTriggered: false
            });
            processDailyEvents();
        });
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};