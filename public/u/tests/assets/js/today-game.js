// today-game.js - INFP - 꿈의 정원 가꾸기 (Cultivating a Dream Garden)

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
        creativity: 50,
        passion: 50,
        sincerity: 50,
        inspiration: 50,
        empathy: 50,
        actionPoints: 10, // Represents '집중력'
        maxActionPoints: 10,
        resources: { dream_shards: 10, emotion_drops: 10, imagination_seeds: 5, starlight: 0 },
        spirits: [
            { id: "luna", name: "루나", personality: "수줍은", skill: "이야기", communion: 70 },
            { id: "sol", name: "솔", personality: "따뜻한", skill: "음악", communion: 60 }
        ],
        maxSpirits: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { creationSuccess: 0 },
        dailyActions: { daydreamed: false, heldConcert: false, communedWith: [], minigamePlayed: false },
        gardenElements: {
            fountainOfIdeas: { built: false, durability: 100, name: "아이디어의 샘", description: "마르지 않는 영감의 원천입니다.", effect_description: "꿈 조각 자동 생성 및 창의성 보너스." },
            forestOfEmotions: { built: false, durability: 100, name: "감정의 숲", description: "다양한 감정이 나무처럼 자라는 숲입니다.", effect_description: "감정의 물방울 생성 및 공감 능력 향상." },
            altarOfValues: { built: false, durability: 100, name: "가치의 제단", description: "내면의 신념을 되새기는 신성한 장소입니다.", effect_description: "새로운 정령과의 만남 및 진정성 강화." },
            meadowOfComfort: { built: false, durability: 100, name: "위안의 초원", description: "지친 영혼이 쉬어가는 평화로운 공간입니다.", effect_description: "과거의 기억을 통해 스탯 및 자원 획득." },
            starlightObservatory: { built: false, durability: 100, name: "별빛 전망대", description: "밤하늘의 별을 보며 꿈을 키웁니다.", effect_description: "별빛 획득 및 고급 창작 활동 잠금 해제." }
        },
        gardenLevel: 0,
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
        if (!loaded.dailyBonus) loaded.dailyBonus = { creationSuccess: 0 };
        if (!loaded.gardenElements) { // Ensure the whole module object exists
            loaded.gardenElements = {
                fountainOfIdeas: { built: false, durability: 100, name: "아이디어의 샘" },
                forestOfEmotions: { built: false, durability: 100, name: "감정의 숲" },
                altarOfValues: { built: false, durability: 100, name: "가치의 제단" },
                meadowOfComfort: { built: false, durability: 100, name: "위안의 초원" },
                starlightObservatory: { built: false, durability: 100, name: "별빛 전망대" }
            };
        }
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
        <p><b>${gameState.day}일차의 정원</b></p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>창의성:</b> ${gameState.creativity} | <b>열정:</b> ${gameState.passion} | <b>진정성:</b> ${gameState.sincerity} | <b>영감:</b> ${gameState.inspiration} | <b>공감:</b> ${gameState.empathy}</p>
        <p><b>자원:</b> 꿈 조각 ${gameState.resources.dream_shards}, 감정의 물방울 ${gameState.resources.emotion_drops}, 상상의 씨앗 ${gameState.resources.imagination_seeds}, 별빛 ${gameState.resources.starlight || 0}</p>
        <p><b>정원 레벨:</b> ${gameState.gardenLevel}</p>
        <p><b>정원의 정령들 (${gameState.spirits.length}/${gameState.maxSpirits}):</b></p>
        <ul>${spiritListHtml}</ul>
        <p><b>정원 요소:</b></p>
        <ul>${Object.values(gameState.gardenElements).filter(e => e.built).map(e => `<li>${e.name} (내구성: ${e.durability})</li>`).join('') || '없음'}</ul>
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
        dynamicChoices = [];
        if (!gameState.gardenElements.fountainOfIdeas.built) dynamicChoices.push({ text: "아이디어의 샘 건설 (꿈 조각 50, 감정의 물방울 20)", action: "build_fountainOfIdeas" });
        if (!gameState.gardenElements.forestOfEmotions.built) dynamicChoices.push({ text: "감정의 숲 조성 (감정의 물방울 30, 상상의 씨앗 30)", action: "build_forestOfEmotions" });
        if (!gameState.gardenElements.altarOfValues.built) dynamicChoices.push({ text: "가치의 제단 설립 (꿈 조각 100, 감정의 물방울 50)", action: "build_altarOfValues" });
        if (!gameState.gardenElements.meadowOfComfort.built) dynamicChoices.push({ text: "위안의 초원 조성 (감정의 물방울 80, 상상의 씨앗 40)", action: "build_meadowOfComfort" });
        if (gameState.gardenElements.fountainOfIdeas.built && !gameState.gardenElements.starlightObservatory.built) {
            dynamicChoices.push({ text: "별빛 전망대 건설 (꿈 조각 150, 별빛 5)", action: "build_starlightObservatory" });
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

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}' >${choice.text}</button>`).join('');
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

// --- Game Data (INFP Themed) ---
const gameScenarios = {
    "intro": { text: "오늘은 정원을 위해 무엇을 할까요?", choices: [
        { text: "몽상하기", action: "daydream" },
        { text: "정령과 교감하기", action: "commune_with_spirits" },
        { text: "작은 음악회 열기", action: "hold_small_concert" },
        { text: "자원 모으기", action: "show_resource_gathering_options" },
        { text: "정원 요소 관리", action: "show_element_management_options" },
        { text: "고요한 사색", action: "show_quiet_contemplation_options" },
        { text: "오늘의 이야기 만들기", action: "play_minigame" }
    ]},
    "action_resource_gathering": {
        text: "어떤 자원을 모으시겠습니까?",
        choices: [
            { text: "꿈 조각 모으기", action: "gather_dream_shards" },
            { text: "감정의 물방울 모으기", action: "gather_emotion_drops" },
            { text: "상상의 씨앗 심기", action: "plant_imagination_seeds" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "action_element_management": { text: "어떤 정원 요소를 관리하시겠습니까?", choices: [] },
    "quiet_contemplation_menu": {
        text: "어떤 사색에 잠기시겠습니까?",
        choices: [
            { text: "이야기 조각 맞추기 (집중력 1 소모)", action: "play_story_puzzle" },
            { text: "감정의 강 낚시 (집중력 1 소모)", action: "go_emotion_fishing" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    // Game Over Scenarios
    "game_over_creativity": { text: "창의성이 메말라 더 이상 정원을 가꿀 수 없습니다. 정원은 빛을 잃었습니다.", choices: [], final: true },
    "game_over_passion": { text: "열정이 모두 식어버렸습니다. 정원을 돌볼 마음의 불꽃이 꺼졌습니다.", choices: [], final: true },
    "game_over_sincerity": { text: "진정성을 잃은 당신의 마음을 정령들이 더 이상 믿지 않습니다. 그들은 정원을 떠났습니다.", choices: [], final: true },
    "game_over_resources": { text: "정원을 가꿀 자원이 모두 소진되었습니다. 꿈의 정원은 황폐해졌습니다.", choices: [], final: true },
};

const daydreamOutcomes = [
    { weight: 30, condition: (gs) => gs.inspiration > 60, effect: (gs) => { const v = getRandomValue(10, 5); return { changes: { creativity: gs.creativity + v }, message: `달콤한 몽상 속에서 새로운 아이디어를 발견했습니다! (+${v} 창의성)` }; } },
    { weight: 25, condition: () => true, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { empathy: gs.empathy + v }, message: `타인에 대한 몽상을 하며 공감 능력이 깊어졌습니다. (+${v} 공감)` }; } },
    { weight: 20, condition: () => true, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { resources: { ...gs.resources, dream_shards: gs.resources.dream_shards - v } }, message: `몽상에 너무 깊이 빠져 꿈 조각 일부를 잃어버렸습니다. (-${v} 꿈 조각)` }; } },
    { weight: 15, condition: (gs) => gs.inspiration < 40, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { passion: gs.passion - v }, message: `아무런 영감도 떠오르지 않아 열정이 조금 식었습니다. (-${v} 열정)` }; } },
];

const communeOutcomes = [
    { weight: 40, condition: (gs, spirit) => spirit.communion < 80, effect: (gs, spirit) => { const v = getRandomValue(10, 5); const updated = gs.spirits.map(s => s.id === spirit.id ? { ...s, communion: Math.min(100, s.communion + v) } : s); return { changes: { spirits: updated }, message: `${spirit.name}${getWaGwaParticle(spirit.name)} 깊은 교감을 나누어 교감도가 상승했습니다. (+${v} 교감)` }; } },
    { weight: 30, condition: () => true, effect: (gs, spirit) => { const v = getRandomValue(5, 2); return { changes: { sincerity: gs.sincerity + v }, message: `${spirit.name}에게서 진정한 위로를 받아 진정성이 깊어졌습니다. (+${v} 진정성)` }; } },
    { weight: 20, condition: (gs) => gs.empathy < 40, effect: (gs, spirit) => { const v = getRandomValue(10, 3); const updated = gs.spirits.map(s => s.id === spirit.id ? { ...s, communion: Math.max(0, s.communion - v) } : s); return { changes: { spirits: updated }, message: `당신의 공감 능력이 부족하여 ${spirit.name}이(가) 마음을 닫습니다. (-${v} 교감)` }; } },
];

const concertOutcomes = [
    { weight: 40, condition: (gs) => gs.creativity > 60, effect: (gs) => { const v = getRandomValue(10, 3); return { changes: { passion: gs.passion + v }, message: `창의적인 음악회에 정령들이 감동하여 당신의 열정이 타오릅니다. (+${v} 열정)` }; } },
    { weight: 30, condition: () => true, effect: (gs) => { const v = getRandomValue(10, 3); return { changes: { inspiration: gs.inspiration + v }, message: `음악회를 통해 새로운 영감을 얻었습니다. (+${v} 영감)` }; } },
    { weight: 20, condition: (gs) => gs.passion < 40, effect: (gs) => { const v = getRandomValue(10, 4); return { changes: { empathy: gs.empathy - v }, message: `열정 없는 음악회에 정령들이 실망했습니다. (-${v} 공감)` }; } },
];

const minigames = [
    {
        name: "이야기 만들기",
        description: "주어진 단어들을 사용해 짧은 이야기를 완성하세요.",
        start: (gameArea, choicesDiv) => {
            const keywords = ["별", "숲", "노래", "비밀", "꿈"];
            gameState.minigameState = { score: 0, usedWords: [], sentence: "" };
            gameArea.innerHTML = `<p>${minigames[0].description}</p><p>사용할 단어: ${keywords.join(", ")}</p><textarea id="story-input" rows="4" style="width: 100%;"></textarea>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[0].processAction('submit_story')">이야기 완성</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'submit_story') {
                const story = document.getElementById('story-input').value;
                const keywords = ["별", "숲", "노래", "비밀", "꿈"];
                let score = 0;
                keywords.forEach(word => { if (story.includes(word)) score += 25; });
                gameState.minigameState.score = score;
                minigames[0].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({ creativity: gameState.creativity + rewards.creativity, inspiration: gameState.inspiration + rewards.inspiration, currentScenarioId: 'intro' }, rewards.message);
        }
    },
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { creativity: 0, inspiration: 0, message: "" };
    if (score >= 100) { rewards.creativity = 15; rewards.inspiration = 10; rewards.message = "한 편의 서사시가 탄생했습니다! (+15 창의성, +10 영감)"; } 
    else if (score >= 50) { rewards.creativity = 10; rewards.inspiration = 5; rewards.message = "아름다운 이야기입니다. (+10 창의성, +5 영감)"; } 
    else { rewards.creativity = 5; rewards.message = "이야기를 완성했습니다. (+5 창의성)"; }
    return rewards;
}

function spendActionPoint() {
    if (gameState.actionPoints <= 0) { updateGameDisplay("집중력이 부족합니다."); return false; }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    daydream: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = daydreamOutcomes.filter(o => !o.condition || o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    commune_with_spirits: () => {
        if (!spendActionPoint()) return;
        const spirit = gameState.spirits[Math.floor(currentRandFn() * gameState.spirits.length)];
        const possibleOutcomes = communeOutcomes.filter(o => !o.condition || o.condition(gameState, spirit));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState, spirit);
        updateState(result.changes, result.message);
    },
    hold_small_concert: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = concertOutcomes.filter(o => !o.condition || o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    show_resource_gathering_options: () => updateState({ currentScenarioId: 'action_resource_gathering' }),
    show_element_management_options: () => updateState({ currentScenarioId: 'action_element_management' }),
    show_quiet_contemplation_options: () => updateState({ currentScenarioId: 'quiet_contemplation_menu' }),
    gather_dream_shards: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(10, 4);
        updateState({ resources: { ...gameState.resources, dream_shards: gameState.resources.dream_shards + gain } }, `꿈 조각을 모았습니다. (+${gain} 꿈 조각)`);
    },
    gather_emotion_drops: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(10, 4);
        updateState({ resources: { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops + gain } }, `감정의 물방울을 모았습니다. (+${gain} 감정의 물방울)`);
    },
    plant_imagination_seeds: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(5, 2);
        updateState({ resources: { ...gameState.resources, imagination_seeds: gameState.resources.imagination_seeds + gain } }, `상상의 씨앗을 심었습니다. (+${gain} 상상의 씨앗)`);
    },
    build_fountainOfIdeas: () => {
        if (!spendActionPoint()) return;
        const cost = { dream_shards: 50, emotion_drops: 20 };
        if (gameState.resources.dream_shards >= cost.dream_shards && gameState.resources.emotion_drops >= cost.emotion_drops) {
            gameState.gardenElements.fountainOfIdeas.built = true;
            const v = getRandomValue(10, 3);
            updateState({ creativity: gameState.creativity + v, resources: { ...gameState.resources, dream_shards: gameState.resources.dream_shards - cost.dream_shards, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops } }, `아이디어의 샘을 건설했습니다! (+${v} 창의성)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_forestOfEmotions: () => {
        if (!spendActionPoint()) return;
        const cost = { emotion_drops: 30, imagination_seeds: 30 };
        if (gameState.resources.emotion_drops >= cost.emotion_drops && gameState.resources.imagination_seeds >= cost.imagination_seeds) {
            gameState.gardenElements.forestOfEmotions.built = true;
            const v = getRandomValue(10, 3);
            updateState({ empathy: gameState.empathy + v, resources: { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops, imagination_seeds: gameState.resources.imagination_seeds - cost.imagination_seeds } }, `감정의 숲을 조성했습니다! (+${v} 공감)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_altarOfValues: () => {
        if (!spendActionPoint()) return;
        const cost = { dream_shards: 100, emotion_drops: 50 };
        if (gameState.resources.dream_shards >= cost.dream_shards && gameState.resources.emotion_drops >= cost.emotion_drops) {
            gameState.gardenElements.altarOfValues.built = true;
            const v = getRandomValue(15, 5);
            updateState({ sincerity: gameState.sincerity + v, resources: { ...gameState.resources, dream_shards: gameState.resources.dream_shards - cost.dream_shards, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops } }, `가치의 제단을 설립했습니다! (+${v} 진정성)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_meadowOfComfort: () => {
        if (!spendActionPoint()) return;
        const cost = { emotion_drops: 80, imagination_seeds: 40 };
        if (gameState.resources.emotion_drops >= cost.emotion_drops && gameState.resources.imagination_seeds >= cost.imagination_seeds) {
            gameState.gardenElements.meadowOfComfort.built = true;
            const v = getRandomValue(15, 5);
            updateState({ passion: gameState.passion + v, resources: { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops, imagination_seeds: gameState.resources.imagination_seeds - cost.imagination_seeds } }, `위안의 초원을 조성했습니다! (+${v} 열정)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_starlightObservatory: () => {
        if (!spendActionPoint()) return;
        const cost = { dream_shards: 150, starlight: 5 };
        if (gameState.resources.dream_shards >= cost.dream_shards && gameState.resources.starlight >= cost.starlight) {
            gameState.gardenElements.starlightObservatory.built = true;
            const v = getRandomValue(20, 5);
            updateState({ inspiration: gameState.inspiration + v, resources: { ...gameState.resources, dream_shards: gameState.resources.dream_shards - cost.dream_shards, starlight: gameState.resources.starlight - cost.starlight } }, `별빛 전망대를 건설했습니다! (+${v} 영감)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    maintain_element: (params) => {
        if (!spendActionPoint()) return;
        const elementKey = params.element;
        const cost = { emotion_drops: 10, imagination_seeds: 10 };
        if (gameState.resources.emotion_drops >= cost.emotion_drops && gameState.resources.imagination_seeds >= cost.imagination_seeds) {
            gameState.gardenElements[elementKey].durability = 100;
            updateState({ resources: { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops, imagination_seeds: gameState.resources.imagination_seeds - cost.imagination_seeds } }, `${gameState.gardenElements[elementKey].name}을(를) 정화했습니다.`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    play_story_puzzle: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) {
            const v = getRandomValue(1, 1);
            updateState({ resources: { ...gameState.resources, starlight: (gameState.resources.starlight || 0) + v } }, `이야기 조각에서 반짝이는 별빛을 발견했습니다! (+${v} 별빛)`);
        } else {
            const v = getRandomValue(10, 5);
            updateState({ resources: { ...gameState.resources, dream_shards: gameState.resources.dream_shards + v } }, `흩어진 이야기 조각을 맞추어 꿈 조각을 얻었습니다. (+${v} 꿈 조각)`);
        }
    },
    go_emotion_fishing: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.6) {
            const v = getRandomValue(10, 5);
            updateState({ resources: { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops + v } }, `감정의 강에서 순수한 감정의 물방울을 낚았습니다. (+${v} 감정의 물방울)`);
        } else {
            updateState({}, `아무것도 낚지 못했습니다. 강은 고요하기만 합니다.`);
        }
    },
    play_minigame: () => {
        if (!spendActionPoint()) return;
        const minigame = minigames[0];
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 다음 날로 넘어갈 수 없습니다."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
};

function applyStatEffects() {
    let message = "";
    if (gameState.creativity >= 70) { message += "넘치는 창의력으로 정원이 더욱 풍성해집니다. "; }
    if (gameState.passion >= 70) { const v = getRandomValue(5, 2); gameState.resources.dream_shards += v; message += `당신의 열정이 꿈 조각을 끌어당깁니다. (+${v} 꿈 조각) `; }
    if (gameState.sincerity >= 70) { const v = getRandomValue(2, 1); gameState.spirits.forEach(s => s.communion = Math.min(100, s.communion + v)); message += `당신의 진정성에 정령들이 더 깊이 교감합니다. (+${v} 교감) `; }
    if (gameState.inspiration < 30) { gameState.actionPoints -= 1; message += "영감이 떠오르지 않아 집중력이 1 감소합니다. "; }
    if (gameState.empathy < 30) { Object.keys(gameState.gardenElements).forEach(key => { if(gameState.gardenElements[key].built) gameState.gardenElements[key].durability -= 1; }); message += "공감의 부족으로 정원 요소들이 시들고 있습니다. "; }
    return message;
}

const weightedDailyEvents = [
    { id: "creative_drought", weight: 10, condition: () => gameState.creativity < 40, onTrigger: () => { const v = getRandomValue(10, 3); updateState({ creativity: gameState.creativity - v, passion: gameState.passion - v }, `창의적 가뭄이 찾아왔습니다. (-${v} 창의성, -${v} 열정)`); } },
    { id: "nightmare_invasion", weight: 5, condition: () => true, onTrigger: () => { const v = getRandomValue(15, 5); updateState({ resources: { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops - v }, sincerity: gameState.sincerity - 5 }, `악몽이 정원을 침범했습니다. (-${v} 감정의 물방울, -5 진정성)`); } },
    { id: "new_inspiration", weight: 15, condition: () => true, onTrigger: () => { const v = getRandomValue(10, 5); updateState({ inspiration: gameState.inspiration + v }, `새로운 영감이 샘솟습니다! (+${v} 영감)`); } },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
    updateState({ actionPoints: 10, dailyEventTriggered: true });
    const statEffectMessage = applyStatEffects();
    let dailyMessage = "정원에 새로운 아침이 밝았습니다. " + statEffectMessage;

    if (gameState.creativity <= 0) { gameState.currentScenarioId = "game_over_creativity"; }
    else if (gameState.passion <= 0) { gameState.currentScenarioId = "game_over_passion"; }
    else if (gameState.sincerity <= 0) { gameState.currentScenarioId = "game_over_sincerity"; }
    else if (gameState.resources.dream_shards <= 0 && gameState.day > 1) { gameState.currentScenarioId = "game_over_resources"; }

    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    if (possibleEvents.length > 0) {
        const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenEvent = possibleEvents.find(event => (cumulativeWeight += event.weight) >= rand);
        if (chosenEvent) {
            eventId = chosenEvent.id;
            if (chosenEvent.onTrigger) chosenEvent.onTrigger();
        }
    }
    if (!gameScenarios[gameState.currentScenarioId]) {
        gameState.currentScenarioId = eventId;
    }
    updateGameDisplay(dailyMessage + (gameScenarios[gameState.currentScenarioId]?.text || ''));
    renderChoices(gameScenarios[gameState.currentScenarioId]?.choices || []);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 꿈의 정원을 처음부터 다시 가꾸시겠습니까? 모든 기억이 사라집니다.")) {
        localStorage.removeItem('infpDreamGardenGame');
        resetGameState();
        saveGameState();
        location.reload();
    }
}

window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', gameActions.manualNextDay);
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};
