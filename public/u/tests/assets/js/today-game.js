// today-game.js - INFP - 꿈의 정원 가꾸기 (Dream Garden Cultivation)

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
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

function showFeedback(isSuccess, message) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    if (feedbackMessage) {
        feedbackMessage.innerText = message;
        feedbackMessage.className = `feedback-message ${isSuccess ? 'correct' : 'incorrect'}`;
    }
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        creativity: 50,
        passion: 50,
        authenticity: 50,
        inspiration: 50,
        empathy: 50,
        actionPoints: 10, // Internally actionPoints, but represents 'concentration' in UI
        maxActionPoints: 10,
        resources: { dream_fragments: 10, emotion_drops: 10, imagination_seeds: 5, starlight: 0 },
        spirits: [
            { id: "luna", name: "루나", personality: "수줍은", skill: "이야기", trust: 70 },
            { id: "sol", name: "솔", personality: "따뜻한", skill: "음악", trust: 60 }
        ],
        maxSpirits: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { creationSuccess: 0 }, // Re-themed from gatheringSuccess
        dailyActions: { daydreamed: false, communed: false, concertHeld: false, minigamePlayed: false }, // Re-themed
        gardenElements: {
            ideaSpring: { built: false, durability: 100, name: "아이디어의 샘", description: "새로운 아이디어를 샘솟게 합니다.", effect_description: "창의성 및 영감 증가." },
            emotionForest: { built: false, durability: 100, name: "감정의 숲", description: "내면의 감정을 탐색하고 치유합니다.", effect_description: "공감 및 진정성 증가." },
            valueAltar: { built: false, durability: 100, name: "가치의 제단", description: "자신의 가치관을 확립하고 강화합니다.", effect_description: "열정 및 진정성 증가." },
            comfortMeadow: { built: false, durability: 100, name: "위안의 초원", description: "지친 마음을 위로하고 재충전합니다.", effect_description: "집중력 회복 및 스트레스 감소." },
            starlightObservatory: { built: false, durability: 100, name: "별빛 전망대", description: "밤하늘의 별을 보며 영감을 얻습니다.", effect_description: "영감 및 희귀 자원 발견 확률 증가." }
        },
        gardenLevel: 0, // Re-themed from toolsLevel
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
                { id: "luna", name: "루나", personality: "수줍은", skill: "이야기", trust: 70 },
                { id: "sol", name: "솔", personality: "따뜻한", skill: "음악", trust: 60 }
            ];
        }
        // Ensure new stats are initialized if loading old save
        if (loaded.authenticity === undefined) loaded.authenticity = 50;
        if (loaded.inspiration === undefined) loaded.inspiration = 50;
        if (loaded.passion === undefined) loaded.passion = 50;
        if (loaded.creativity === undefined) loaded.creativity = 50;
        if (loaded.empathy === undefined) loaded.empathy = 50;
        if (loaded.gardenLevel === undefined) loaded.gardenLevel = 0;


        Object.assign(gameState, loaded);

        // Always initialize currentRandFn after loading state
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
    const spiritListHtml = gameState.spirits.map(s => `<li>${s.name} (${s.skill}) - 신뢰도: ${s.trust}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>날짜:</b> ${gameState.day}일</p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>창의성:</b> ${gameState.creativity} | <b>열정:</b> ${gameState.passion} | <b>진정성:</b> ${gameState.authenticity} | <b>영감:</b> ${gameState.inspiration} | <b>공감:</b> ${gameState.empathy}</p>
        <p><b>자원:</b> 꿈 조각 ${gameState.resources.dream_fragments}, 감정의 물방울 ${gameState.resources.emotion_drops}, 상상의 씨앗 ${gameState.resources.imagination_seeds}, 별빛 ${gameState.resources.starlight || 0}</p>
        <p><b>정원 레벨:</b> ${gameState.gardenLevel}</p>
        <p><b>정령 (${gameState.spirits.length}/${gameState.maxSpirits}):</b></p>
        <ul>${spiritListHtml}</ul>
        <p><b>가꿔진 정원 요소:</b></p>
        <ul>${Object.values(gameState.gardenElements).filter(e => e.built).map(e => `<li>${e.name} (내구도: ${e.durability}) - ${e.effect_description}</li>`).join('') || '없음'}</ul>
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
    } else if (gameState.currentScenarioId === 'action_garden_element_management') {
        dynamicChoices = gameScenarios.action_garden_element_management.choices ? [...gameScenarios.action_garden_element_management.choices] : [];
        // Build options
        if (!gameState.gardenElements.ideaSpring.built) dynamicChoices.push({ text: "아이디어의 샘 건설 (꿈 조각 50, 감정의 물방울 20)", action: "build_ideaSpring" });
        if (!gameState.gardenElements.emotionForest.built) dynamicChoices.push({ text: "감정의 숲 건설 (감정의 물방울 30, 상상의 씨앗 30)", action: "build_emotionForest" });
        if (!gameState.gardenElements.valueAltar.built) dynamicChoices.push({ text: "가치의 제단 건설 (꿈 조각 100, 감정의 물방울 50, 상상의 씨앗 50)", action: "build_valueAltar" });
        if (!gameState.gardenElements.comfortMeadow.built) dynamicChoices.push({ text: "위안의 초원 건설 (감정의 물방울 80, 상상의 씨앗 40)", action: "build_comfortMeadow" });
        if (gameState.gardenElements.emotionForest.built && gameState.gardenElements.emotionForest.durability > 0 && !gameState.gardenElements.starlightObservatory.built) {
            dynamicChoices.push({ text: "별빛 전망대 건설 (감정의 물방울 50, 상상의 씨앗 100)", action: "build_starlightObservatory" });
        }
        // Maintenance options
        Object.keys(gameState.gardenElements).forEach(key => {
            const element = gameState.gardenElements[key];
            if (element.built && element.durability < 100) {
                dynamicChoices.push({ text: `${element.name} 정화 (감정의 물방울 10, 상상의 씨앗 10)`, action: "purify_garden_element", params: { element: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else { // For any other scenario, use its predefined choices
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

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "꿈의 정원에서 무엇을 할까요?", choices: [
        { text: "몽상하기", action: "daydream" },
        { text: "정령과 교감하기", action: "commune_with_spirits" },
        { text: "작은 음악회 개최", action: "hold_concert" },
        { text: "자원 모으기", action: "show_resource_gathering_options" },
        { text: "정원 요소 관리", action: "show_garden_element_options" },
        { text: "고요한 사색", action: "show_quiet_contemplation_options" },
        { text: "오늘의 이야기", action: "play_minigame" }
    ]},
    "daily_event_creative_drought": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_new_inspiration": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_nightmare_invasion": {
        text: "정원에 악몽의 그림자가 드리웠습니다. 정령들이 두려워하고 있습니다.",
        choices: [
            { text: "정령들을 위로하고 함께 악몽에 맞선다 (집중력 1 소모)", action: "confront_nightmare" },
            { text: "악몽을 무시하고 내버려 둔다", action: "ignore_nightmare" }
        ]
    },
    "daily_event_lost_dream_fragment": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_spirit_conflict": {
        text: "루나와 솔 사이에 창작 방향에 대한 작은 오해가 생겼습니다. 둘 다 당신의 도움을 기다리는 것 같습니다.",
        choices: [
            { text: "루나의 이야기를 먼저 들어준다.", action: "handle_spirit_conflict", params: { first: "luna", second: "sol" } },
            { text: "솔의 이야기를 먼저 들어준다.", action: "handle_spirit_conflict", params: { first: "sol", second: "luna" } },
            { text: "둘을 불러 화해시킨다.", action: "mediate_spirit_conflict" },
            { text: "신경 쓰지 않는다.", action: "ignore_event" }
        ]
    },
    "daily_event_new_spirit": {
        choices: [
            { text: "따뜻하게 환영하고 정착을 돕는다.", action: "welcome_new_unique_spirit" },
            { text: "정원에 필요한지 좀 더 지켜본다.", action: "observe_spirit" },
            { text: "정착을 거절한다.", action: "reject_spirit" }
        ]
    },
    "daily_event_starlight_shower": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_forgotten_melody": {
        text: "정원에서 잊혀진 멜로디가 들려옵니다. 당신의 감성을 자극합니다.",
        choices: [
            { text: "멜로디를 따라간다 (집중력 1 소모)", action: "follow_melody" },
            { text: "바빠서 지나친다", action: "decline_melody" }
        ]
    },
    "daily_event_dream_weaver_visit": {
        text: "꿈 조각가가 정원을 방문했습니다. 그는 [꿈 조각 50개]를 [별빛 5개]와 교환하자고 제안합니다.",
        choices: [
            { text: "제안을 수락한다", action: "accept_dream_trade" },
            { text: "제안을 거절한다", action: "decline_dream_trade" }
        ]
    },
    "daily_event_creative_block": {
        text: "갑자기 창의적인 영감이 떠오르지 않습니다. 정원이 침체되는 것 같습니다.",
        choices: [
            { text: "새로운 자극을 찾아 나선다 (집중력 1 소모)", action: "seek_inspiration" },
            { text: "잠시 쉬면서 기다린다", action: "wait_for_inspiration" }
        ]
    },
    "game_over_creativity": { text: "정원의 창의성이 고갈되어 더 이상 새로운 아이디어가 나오지 않습니다. 꿈의 정원은 활력을 잃었습니다.", choices: [], final: true },
    "game_over_passion": { text: "당신의 열정이 식어버렸습니다. 꿈의 정원을 가꿀 동력을 상실했습니다.", choices: [], final: true },
    "game_over_authenticity": { text: "당신의 진정성이 무너졌습니다. 꿈의 정원은 더 이상 당신의 내면을 반영하지 않습니다.", choices: [], final: true },
    "game_over_inspiration": { text: "영감이 모두 사라졌습니다. 꿈의 정원은 메마르고 황량해졌습니다.", choices: [], final: true },
    "game_over_empathy": { text: "정령들과의 공감대가 사라졌습니다. 정령들은 당신을 떠나기 시작했습니다.", choices: [], final: true },
    "game_over_resources": { text: "꿈의 정원 자원이 모두 고갈되어 더 이상 가꿀 수 없습니다.", choices: [], final: true },
    "action_resource_gathering": {
        text: "어떤 자원을 모으시겠습니까?",
        choices: [
            { text: "꿈 조각 모으기", action: "gather_dream_fragments" },
            { text: "감정의 물방울 채집", action: "gather_emotion_drops" },
            { text: "상상의 씨앗 찾기", "action": "gather_imagination_seeds" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_garden_element_management": {
        text: "어떤 정원 요소를 관리하시겠습니까?",
        choices: [] // Choices will be dynamically added in renderChoices
    },
    "resource_gathering_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_resource_gathering_options" }] // Return to gathering menu
    },
    "garden_element_management_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_garden_element_options" }] // Return to facility management menu
    },
    "spirit_conflict_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "nightmare_confrontation_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "quiet_contemplation_menu": {
        text: "어떤 고요한 사색을 하시겠습니까?",
        choices: [
            { text: "이야기 조각 맞추기 (집중력 1 소모)", action: "match_story_fragments" },
            { text: "감정의 강 낚시 (집중력 1 소모)", action: "fish_emotion_river" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
};

const concertOutcomes = [
    {
        condition: (gs) => gs.passion < 40,
        weight: 40,
        effect: (gs) => {
            const passionLoss = getRandomValue(10, 4);
            const authenticityLoss = getRandomValue(5, 2);
            const empathyLoss = getRandomValue(5, 2);
            return {
                changes: { passion: gs.passion - passionLoss, authenticity: gs.authenticity - authenticityLoss, empathy: gs.empathy - empathyLoss },
                message: `음악회가 시작되자마자 정령들의 불만이 터져 나왔습니다. 낮은 열정으로 인해 분위기가 험악합니다. (-${passionLoss} 열정, -${authenticityLoss} 진정성, -${empathyLoss} 공감)`
            };
        }
    },
    {
        condition: (gs) => gs.empathy > 70 && gs.creativity > 60,
        weight: 30,
        effect: (gs) => {
            const empathyGain = getRandomValue(15, 5);
            const passionGain = getRandomValue(10, 3);
            const inspirationGain = getRandomValue(10, 3);
            return {
                changes: { empathy: gs.empathy + empathyGain, passion: gs.passion + passionGain, inspiration: gs.inspiration + inspirationGain },
                message: `높은 공감대와 창의성을 바탕으로 아름다운 음악회가 열렸습니다! (+${empathyGain} 공감, +${passionGain} 열정, +${inspirationGain} 영감)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.dream_fragments < gs.spirits.length * 4,
        weight: 25,
        effect: (gs) => {
            const creativityGain = getRandomValue(10, 3);
            const inspirationGain = getRandomValue(5, 2);
            return {
                changes: { creativity: gs.creativity + creativityGain, inspiration: gs.inspiration + inspirationGain },
                message: `꿈 조각이 부족한 상황에 대해 논의했습니다. 모두가 아껴 쓰기로 동의하며 당신의 리더십을 신뢰했습니다. (+${creativityGain} 창의성, +${inspirationGain} 영감)`
            };
        }
    },
    {
        condition: (gs) => gs.spirits.some(s => s.trust < 50),
        weight: 20,
        effect: (gs) => {
            const spirit = gs.spirits.find(s => s.trust < 50);
            const trustGain = getRandomValue(10, 4);
            const empathyGain = getRandomValue(5, 2);
            const inspirationGain = getRandomValue(5, 2);
            const updatedSpirits = gs.spirits.map(s => s.id === spirit.id ? { ...s, trust: Math.min(100, s.trust + trustGain) } : s);
            return {
                changes: { spirits: updatedSpirits, empathy: gs.empathy + empathyGain, inspiration: gs.inspiration + inspirationGain },
                message: `음악회 중, ${spirit.name}이(가) 조심스럽게 불만을 토로했습니다. 그의 의견을 존중하고 해결을 약속하자 신뢰를 얻었습니다. (+${trustGain} ${spirit.name} 신뢰도, +${empathyGain} 공감, +${inspirationGain} 영감)`
            };
        }
    },
    {
        condition: () => true, // Default positive outcome
        weight: 20,
        effect: (gs) => {
            const authenticityGain = getRandomValue(5, 2);
            const inspirationGain = getRandomValue(3, 1);
            return {
                changes: { authenticity: gs.authenticity + authenticityGain, inspiration: gs.inspiration + inspirationGain },
                message: `평범한 음악회였지만, 모두가 한자리에 모여 감정을 나눈 것만으로도 의미가 있었습니다. (+${authenticityGain} 진정성, +${inspirationGain} 영감)`
            };
        }
    },
    {
        condition: (gs) => gs.authenticity < 40 || gs.empathy < 40,
        weight: 25, // Increased weight when conditions met
        effect: (gs) => {
            const passionLoss = getRandomValue(5, 2);
            const authenticityLoss = getRandomValue(5, 2);
            const inspirationLoss = getRandomValue(5, 2);
            return {
                changes: { passion: gs.passion - passionLoss, authenticity: gs.authenticity - authenticityLoss, inspiration: gs.inspiration - inspirationLoss },
                message: `음악회는 길어졌지만, 의견 차이만 확인하고 끝났습니다. 정령들의 열정과 진정성, 당신의 영감이 약간 감소했습니다. (-${passionLoss} 열정, -${authenticityLoss} 진정성, -${inspirationLoss} 영감)`
            };
        }
    }
];

const daydreamOutcomes = [
    {
        condition: (gs) => gs.resources.dream_fragments < 20,
        weight: 30,
        effect: (gs) => {
            const dreamGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, dream_fragments: gs.resources.dream_fragments + dreamGain } },
                message: `몽상 중 잊혀진 꿈 조각을 발견했습니다! (+${dreamGain} 꿈 조각)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.emotion_drops < 20,
        weight: 25,
        effect: (gs) => {
            const emotionGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, emotion_drops: gs.resources.emotion_drops + emotionGain } },
                message: `몽상 중 감정의 물방울을 채집했습니다! (+${emotionGain} 감정의 물방울)`
            };
        }
    },
    {
        condition: () => true, // General positive discovery
        weight: 20,
        effect: (gs) => {
            const empathyGain = getRandomValue(5, 2);
            const creativityGain = getRandomValue(5, 2);
            return {
                changes: { empathy: gs.empathy + empathyGain, creativity: gs.creativity + creativityGain },
                message: `몽상하며 새로운 영감을 얻었습니다. (+${empathyGain} 공감, +${creativityGain} 창의성)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 25, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const passionLoss = getRandomValue(5, 2);
            const creativityLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, passion: gs.passion - passionLoss, creativity: gs.creativity - creativityLoss },
                message: `몽상에 너무 깊이 빠져 집중력을 소모하고 열정과 창의성이 감소했습니다. (-${actionLoss} 집중력, -${passionLoss} 열정, -${creativityLoss} 창의성)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 15, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const authenticityLoss = getRandomValue(5, 2);
            const inspirationLoss = getRandomValue(5, 2);
            return {
                changes: { authenticity: gs.authenticity - authenticityLoss, inspiration: gs.inspiration - inspirationLoss },
                message: `몽상 중 예상치 못한 어려움에 부딪혀 진정성과 영감이 약간 감소했습니다. (-${authenticityLoss} 진정성, -${inspirationLoss} 영감)`
            };
        }
    }
];

const communeOutcomes = [
    {
        condition: (gs, spirit) => spirit.trust < 60,
        weight: 40,
        effect: (gs, spirit) => {
            const trustGain = getRandomValue(10, 5);
            const empathyGain = getRandomValue(5, 2);
            const inspirationGain = getRandomValue(5, 2);
            const updatedSpirits = gs.spirits.map(s => s.id === spirit.id ? { ...s, trust: Math.min(100, s.trust + trustGain) } : s);
            return {
                changes: { spirits: updatedSpirits, empathy: gs.empathy + empathyGain, inspiration: gs.inspiration + inspirationGain },
                message: `${spirit.name}${getWaGwaParticle(spirit.name)} 깊은 대화를 나누며 신뢰와 당신의 영감을 얻었습니다. (+${trustGain} ${spirit.name} 신뢰도, +${empathyGain} 공감, +${inspirationGain} 영감)`
            };
        }
    },
    {
        condition: (gs, spirit) => spirit.personality === "따뜻한",
        weight: 20,
        effect: (gs, spirit) => {
            const passionGain = getRandomValue(10, 3);
            const creativityGain = getRandomValue(5, 2);
            return {
                changes: { passion: gs.passion + passionGain, creativity: gs.creativity + creativityGain },
                message: `${spirit.name}${getWaGwaParticle(spirit.name)} 즐거운 대화를 나누며 열정과 창의성이 상승했습니다. (+${passionGain} 열정, +${creativityGain} 창의성)`
            };
        }
    },
    {
        condition: (gs, spirit) => spirit.skill === "이야기",
        weight: 15,
        effect: (gs, spirit) => {
            const dreamGain = getRandomValue(5, 2);
            return {
                changes: { resources: { ...gs.resources, dream_fragments: gs.resources.dream_fragments + dreamGain } },
                message: `${spirit.name}${getWaGwaParticle(spirit.name)}에게서 흥미로운 이야기를 듣고 꿈 조각을 추가로 확보했습니다. (+${dreamGain} 꿈 조각)`
            };
        }
    },
    {
        condition: (gs, spirit) => true, // Default positive outcome
        weight: 25,
        effect: (gs, spirit) => {
            const authenticityGain = getRandomValue(5, 2);
            const inspirationGain = getRandomValue(3, 1);
            return {
                changes: { authenticity: gs.authenticity + authenticityGain, inspiration: gs.inspiration + inspirationGain },
                message: `${spirit.name}${getWaGwaParticle(spirit.name)} 소소한 이야기를 나누며 진정성과 당신의 영감이 조금 더 단단해졌습니다. (+${authenticityGain} 진정성, +${inspirationGain} 영감)`
            };
        }
    },
    {
        condition: (gs, spirit) => gs.authenticity < 40 || spirit.trust < 40,
        weight: 20, // Increased weight when conditions met
        effect: (gs, spirit) => {
            const trustLoss = getRandomValue(10, 3);
            const passionLoss = getRandomValue(5, 2);
            const inspirationLoss = getRandomValue(5, 2);
            const updatedSpirits = gs.spirits.map(s => s.id === spirit.id ? { ...s, trust: Math.max(0, s.trust - trustLoss) } : s);
            return {
                changes: { spirits: updatedSpirits, passion: gs.passion - passionLoss, inspiration: gs.inspiration - inspirationLoss },
                message: `${spirit.name}${getWaGwaParticle(spirit.name)} 대화 중 오해를 사서 신뢰도와 열정, 당신의 영감이 감소했습니다. (-${trustLoss} ${spirit.name} 신뢰도, -${passionLoss} 열정, -${inspirationLoss} 영감)`
            };
        }
    },
    {
        condition: (gs) => gs.passion < 30,
        weight: 15, // Increased weight when conditions met
        effect: (gs, spirit) => {
            const actionLoss = getRandomValue(1, 0);
            const creativityLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, creativity: gs.creativity - creativityLoss },
                message: `${spirit.name}${getWaGwaParticle(spirit.name)} 대화가 길어졌지만, 특별한 소득은 없었습니다. 당신의 창의성이 감소했습니다. (-${actionLoss} 집중력, -${creativityLoss} 창의성)`
            };
        }
    }
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { creativity: 0, passion: 0, authenticity: 0, inspiration: 0, empathy: 0, message: "" };

    switch (minigameName) {
        case "이야기 만들기":
            if (score >= 51) {
                rewards.creativity = 15;
                rewards.inspiration = 10;
                rewards.passion = 5;
                rewards.empathy = 5;
                rewards.message = `최고의 이야기꾼이 되셨습니다! (+15 창의성, +10 영감, +5 열정, +5 공감)`;
            } else if (score >= 21) {
                rewards.creativity = 10;
                rewards.inspiration = 5;
                rewards.passion = 3;
                rewards.message = `훌륭한 이야기입니다! (+10 창의성, +5 영감, +3 열정)`;
            } else if (score >= 0) {
                rewards.creativity = 5;
                rewards.message = `이야기 만들기를 완료했습니다. (+5 창의성)`;
            } else {
                rewards.message = `이야기 만들기를 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        case "감정 단어 맞추기": // Placeholder for now, but re-themed
            rewards.empathy = 2;
            rewards.authenticity = 1;
            rewards.message = `감정 단어 맞추기를 완료했습니다. (+2 공감, +1 진정성)`;
            break;
        case "꿈 조각 퍼즐": // Placeholder for now, but re-themed
            rewards.creativity = 2;
            rewards.inspiration = 1;
            rewards.message = `꿈 조각 퍼즐을 완료했습니다. (+2 창의성, +1 영감)`;
            break;
        case "정령의 노래 부르기": // Placeholder for now, but re-themed
            rewards.passion = 2;
            rewards.empathy = 1;
            rewards.message = `정령의 노래 부르기를 완료했습니다. (+2 열정, +1 공감)`;
            break;
        case "가치관 탐색 퀴즈": // Placeholder for now, but re-themed
            rewards.authenticity = 2;
            rewards.inspiration = 1;
            rewards.message = `가치관 탐색 퀴즈를 완료했습니다. (+2 진정성, +1 영감)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}${getEulReParticle(minigameName)} 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "이야기 만들기",
        description: "주어진 단어들을 조합하여 자신만의 이야기를 만들어보세요. 이야기가 길고 창의적일수록 높은 점수를 얻습니다!",
        start: (gameArea, choicesDiv) => {
            const storyWords = ["꿈", "정령", "숲", "별빛", "감정", "모험", "진실", "영감", "치유", "성장"];
            gameState.minigameState = {
                availableWords: storyWords.sort(() => currentRandFn() - 0.5).slice(0, 5), // 5 random words
                currentStory: [],
                score: 0,
                wordInput: ""
            };
            minigames[0].render(gameArea, choicesDiv);
        },
        render: (gameArea, choicesDiv) => {
            const state = gameState.minigameState;
            gameArea.innerHTML = `
                <p><b>점수:</b> ${state.score}</p>
                <p><b>사용 가능한 단어:</b> ${state.availableWords.join(', ')}</p>
                <p><b>현재 이야기:</b> ${state.currentStory.join(' ')}</p>
                <input type="text" id="storyWordInput" placeholder="단어를 입력하거나 조합하세요" style="font-size: 1.2em; padding: 8px; width: 80%; margin-top: 10px;" autocomplete="off">
            `;
            choicesDiv.innerHTML = `
                <button class="choice-btn" data-action="addWord">단어 추가</button>
                <button class="choice-btn" data-action="endStory">이야기 완성</button>
            `;
            const input = document.getElementById('storyWordInput');
            input.value = state.wordInput;
            input.focus();
            input.addEventListener('input', (e) => { state.wordInput = e.target.value; });
            choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const action = button.dataset.action;
                    if (action === "addWord") {
                        minigames[0].processAction('addWord', state.wordInput);
                    } else if (action === "endStory") {
                        minigames[0].processAction('endStory');
                    }
                });
            });
        },
        processAction: (actionType, value = null) => {
            const state = gameState.minigameState;
            if (actionType === 'addWord') {
                const word = value.trim();
                if (word.length > 0) {
                    state.currentStory.push(word);
                    state.score += word.length * 2; // Score based on word length
                    state.wordInput = "";
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                }
            } else if (actionType === 'endStory') {
                minigames[0].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                creativity: gameState.creativity + rewards.creativity,
                passion: gameState.passion + rewards.passion,
                inspiration: gameState.inspiration + rewards.inspiration,
                empathy: gameState.empathy + rewards.empathy,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "감정 단어 맞추기",
        description: "초성으로 주어진 감정 관련 단어를 맞추는 어휘력 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 10 };
            gameArea.innerHTML = `<p>${minigames[1].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[1].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {}, 
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[1].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[1].name, gameState.minigameState.score);
            updateState({
                empathy: gameState.empathy + rewards.empathy,
                authenticity: gameState.authenticity + rewards.authenticity,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "꿈 조각 퍼즐",
        description: "흩어진 꿈 조각들을 맞춰 하나의 아름다운 그림을 완성하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 15 };
            gameArea.innerHTML = `<p>${minigames[2].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[2].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {}, 
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[2].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[2].name, gameState.minigameState.score);
            updateState({
                creativity: gameState.creativity + rewards.creativity,
                inspiration: gameState.inspiration + rewards.inspiration,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "정령의 노래 부르기",
        description: "정령들이 좋아하는 멜로디를 기억하고 정확하게 따라 부르세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 20 };
            gameArea.innerHTML = `<p>${minigames[3].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[3].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {}, 
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[3].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[3].name, gameState.minigameState.score);
            updateState({
                passion: gameState.passion + rewards.passion,
                empathy: gameState.empathy + rewards.empathy,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "가치관 탐색 퀴즈",
        description: "다양한 상황에서 당신의 가치관을 선택하고, INFP로서의 진정성을 확인하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 25 };
            gameArea.innerHTML = `<p>${minigames[4].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[4].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {}, 
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[4].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[4].name, gameState.minigameState.score);
            updateState({
                authenticity: gameState.authenticity + rewards.authenticity,
                inspiration: gameState.inspiration + rewards.inspiration,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    }
];

// --- Game Actions ---
function spendActionPoint() {
    if (gameState.actionPoints <= 0) {
        updateGameDisplay("집중력이 부족합니다.");
        return false;
    }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    daydream: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = daydreamOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = daydreamOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, daydreamed: true } }, result.message);
    },
    commune_with_spirits: () => {
        if (!spendActionPoint()) return;
        const spirit = gameState.spirits[Math.floor(currentRandFn() * gameState.spirits.length)];
        if (gameState.dailyActions.communed) { updateState({ dailyActions: { ...gameState.dailyActions, communed: true } }, `${spirit.name}${getWaGwaParticle(spirit.name)} 이미 충분히 교감했습니다.`); return; }

        const possibleOutcomes = communeOutcomes.filter(outcome => outcome.condition(gameState, spirit));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = communeOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState, spirit);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, communed: true } }, result.message);
    },
    hold_concert: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = concertOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = concertOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            lastPlayedDate: new Date().toISOString().slice(0, 10),
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
    handle_spirit_conflict: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { empathy: 0, passion: 0, inspiration: 0 };

        const trustGain = getRandomValue(10, 3);
        const trustLoss = getRandomValue(5, 2);
        const empathyGain = getRandomValue(5, 2);
        const inspirationGain = getRandomValue(5, 2);

        const updatedSpirits = gameState.spirits.map(s => {
            if (s.id === first) {
                s.trust = Math.min(100, s.trust + trustGain);
                message += `${s.name}의 이야기를 들어주었습니다. ${s.name}의 신뢰도가 상승했습니다. `; 
                reward.empathy += empathyGain;
                reward.inspiration += inspirationGain;
            } else if (s.id === second) {
                s.trust = Math.max(0, s.trust - trustLoss);
                message += `${second}의 신뢰도가 약간 하락했습니다. `; 
            }
            return s;
        });

        updateState({ ...reward, spirits: updatedSpirits, currentScenarioId: 'spirit_conflict_resolution_result' }, message);
    },
    mediate_spirit_conflict: () => {
        if (!spendActionPoint()) return;
        const authenticityGain = getRandomValue(10, 3);
        const passionGain = getRandomValue(5, 2);
        const inspirationGain = getRandomValue(5, 2);
        const message = `당신의 중재로 루나와 솔의 오해가 풀렸습니다. 정원의 진정성과 당신의 영감이 강화되었습니다! (+${authenticityGain} 진정성, +${passionGain} 열정, +${inspirationGain} 영감)`;
        updateState({ authenticity: gameState.authenticity + authenticityGain, passion: gameState.passion + passionGain, inspiration: gameState.inspiration + inspirationGain, currentScenarioId: 'spirit_conflict_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const passionLoss = getRandomValue(10, 3);
        const authenticityLoss = getRandomValue(5, 2);
        const message = `갈등을 무시했습니다. 정령들의 불만이 커지고 정원의 분위기가 침체됩니다. (-${passionLoss} 열정, -${authenticityLoss} 진정성)`;
        const updatedSpirits = gameState.spirits.map(s => {
            s.trust = Math.max(0, s.trust - 5);
            return s;
        });
        updateState({ passion: gameState.passion - passionLoss, authenticity: gameState.authenticity - authenticityLoss, spirits: updatedSpirits, currentScenarioId: 'spirit_conflict_resolution_result' }, message);
    },
    confront_nightmare: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const empathyGain = getRandomValue(10, 3);
            const authenticityGain = getRandomValue(5, 2);
            message = `정령들과 함께 악몽에 맞섰습니다. 당신의 용기에 공감 지수와 진정성이 상승합니다. (+${empathyGain} 공감, +${authenticityGain} 진정성)`;
            changes.empathy = gameState.empathy + empathyGain;
            changes.authenticity = gameState.authenticity + authenticityGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "악몽에 맞설 집중력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'nightmare_confrontation_result' }, message);
    },
    ignore_nightmare: () => {
        if (!spendActionPoint()) return;
        const empathyLoss = getRandomValue(10, 3);
        const inspirationLoss = getRandomValue(5, 2);
        updateState({ empathy: gameState.empathy - empathyLoss, inspiration: gameState.inspiration - inspirationLoss, currentScenarioId: 'nightmare_confrontation_result' }, `마음이 아프지만, 악몽을 그대로 두었습니다. (-${empathyLoss} 공감, -${inspirationLoss} 영감)`);
    },
    follow_melody: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        let message = "잊혀진 멜로디를 따라갔습니다. ";
        let changes = {};
        if (rand < 0.5) {
            const passionGain = getRandomValue(10, 4);
            const creativityGain = getRandomValue(5, 2);
            message += `아름다운 멜로디에 열정과 창의성이 샘솟습니다. (+${passionGain} 열정, +${creativityGain} 창의성)`;
            changes.passion = gameState.passion + passionGain;
            changes.creativity = gameState.creativity + creativityGain;
        } else {
            const empathyGain = getRandomValue(10, 4);
            const inspirationGain = getRandomValue(5, 2);
            message += `멜로디 속에 숨겨진 이야기에 깊이 공감하며 영감을 얻었습니다. (+${empathyGain} 공감, +${inspirationGain} 영감)`;
            changes.empathy = gameState.empathy + empathyGain;
            changes.inspiration = gameState.inspiration + inspirationGain;
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    decline_melody: () => {
        if (!spendActionPoint()) return;
        const creativityLoss = getRandomValue(5, 2);
        updateState({ creativity: gameState.creativity - creativityLoss, currentScenarioId: 'intro' }, `멜로디를 지나쳤습니다. 아쉽게도 새로운 영감을 놓쳤습니다. (-${creativityLoss} 창의성)`);
    },
    accept_dream_trade: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        if (gameState.resources.dream_fragments >= 50) {
            const inspirationGain = getRandomValue(5, 2);
            message = `꿈 조각가와 무역에 성공하여 별빛을 얻었습니다! 이 별빛은 고급 정원 요소에 사용할 수 있습니다. (+${inspirationGain} 영감)`;
            changes.resources = { ...gameState.resources, dream_fragments: gameState.resources.dream_fragments - 50, starlight: (gameState.resources.starlight || 0) + 5 };
            changes.inspiration = gameState.inspiration + inspirationGain;
        } else {
            message = "무역에 필요한 꿈 조각이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    decline_dream_trade: () => {
        if (!spendActionPoint()) return;
        const inspirationLoss = getRandomValue(5, 2);
        updateState({ inspiration: gameState.inspiration - inspirationLoss, currentScenarioId: 'intro' }, `꿈 조각가의 제안을 거절했습니다. 그는 아쉬워하며 떠났습니다. (-${inspirationLoss} 영감)`);
    },
    seek_inspiration: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        let message = "";
        let changes = {};
        if (rand < 0.6) {
            const inspirationGain = getRandomValue(10, 3);
            const creativityGain = getRandomValue(5, 2);
            message = `새로운 자극을 찾아 영감과 창의성을 회복했습니다. (+${inspirationGain} 영감, +${creativityGain} 창의성)`;
            changes.inspiration = gameState.inspiration + inspirationGain;
            changes.creativity = gameState.creativity + creativityGain;
        } else {
            const passionLoss = getRandomValue(10, 3);
            const authenticityLoss = getRandomValue(5, 2);
            message = `자극을 찾으려 했지만, 오히려 열정과 진정성이 감소했습니다. (-${passionLoss} 열정, -${authenticityLoss} 진정성)`;
            changes.passion = gameState.passion - passionLoss;
            changes.authenticity = gameState.authenticity - authenticityLoss;
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    wait_for_inspiration: () => {
        if (!spendActionPoint()) return;
        const passionLoss = getRandomValue(10, 3);
        const creativityLoss = getRandomValue(5, 2);
        updateState({ passion: gameState.passion - passionLoss, creativity: gameState.creativity - creativityLoss, currentScenarioId: 'intro' }, `영감이 오기를 기다렸지만, 열정과 창의성이 감소했습니다. (-${passionLoss} 열정, -${creativityLoss} 창의성)`);
    },
    show_resource_gathering_options: () => updateState({ currentScenarioId: 'action_resource_gathering' }),
    show_garden_element_options: () => updateState({ currentScenarioId: 'action_garden_element_management' }),
    gather_dream_fragments: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.gardenLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const dreamGain = getRandomValue(5, 2);
            message = `꿈 조각을 성공적으로 모았습니다! (+${dreamGain} 꿈 조각)`;
            changes.resources = { ...gameState.resources, dream_fragments: gameState.resources.dream_fragments + dreamGain };
        } else {
            message = "꿈 조각 모으기에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_emotion_drops: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.gardenLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const emotionGain = getRandomValue(5, 2);
            message = `감정의 물방울을 성공적으로 채집했습니다! (+${emotionGain} 감정의 물방울)`;
            changes.resources = { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops + emotionGain };
        } else {
            message = "감정의 물방울 채집에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_imagination_seeds: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.gardenLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const seedGain = getRandomValue(5, 2);
            message = `상상의 씨앗을 성공적으로 찾았습니다! (+${seedGain} 상상의 씨앗)`;
            changes.resources = { ...gameState.resources, imagination_seeds: gameState.resources.imagination_seeds + seedGain };
        } else {
            message = "상상의 씨앗 찾기에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_ideaSpring: () => {
        if (!spendActionPoint()) return;
        const cost = { dream_fragments: 50, emotion_drops: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.dream_fragments >= cost.dream_fragments && gameState.resources.emotion_drops >= cost.emotion_drops) {
            gameState.gardenElements.ideaSpring.built = true;
            const creativityGain = getRandomValue(10, 3);
            message = `아이디어의 샘을 건설했습니다! (+${creativityGain} 창의성)`;
            changes.creativity = gameState.creativity + creativityGain;
            changes.resources = { ...gameState.resources, dream_fragments: gameState.resources.dream_fragments - cost.dream_fragments, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_emotionForest: () => {
        if (!spendActionPoint()) return;
        const cost = { emotion_drops: 30, imagination_seeds: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.emotion_drops >= cost.emotion_drops && gameState.resources.imagination_seeds >= cost.imagination_seeds) {
            gameState.gardenElements.emotionForest.built = true;
            const empathyGain = getRandomValue(10, 3);
            message = `감정의 숲을 건설했습니다! (+${empathyGain} 공감)`;
            changes.empathy = gameState.empathy + empathyGain;
            changes.resources = { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops, imagination_seeds: gameState.resources.imagination_seeds - cost.imagination_seeds };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_valueAltar: () => {
        if (!spendActionPoint()) return;
        const cost = { dream_fragments: 100, emotion_drops: 50, imagination_seeds: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.dream_fragments >= cost.dream_fragments && gameState.resources.emotion_drops >= cost.emotion_drops && gameState.resources.imagination_seeds >= cost.imagination_seeds) {
            gameState.gardenElements.valueAltar.built = true;
            const passionGain = getRandomValue(20, 5);
            const authenticityGain = getRandomValue(20, 5);
            message = `가치의 제단을 건설했습니다! (+${passionGain} 열정, +${authenticityGain} 진정성)`;
            changes.passion = gameState.passion + passionGain;
            changes.authenticity = gameState.authenticity + authenticityGain;
            changes.resources = { ...gameState.resources, dream_fragments: gameState.resources.dream_fragments - cost.dream_fragments, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops, imagination_seeds: gameState.resources.imagination_seeds - cost.imagination_seeds };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_comfortMeadow: () => {
        if (!spendActionPoint()) return;
        const cost = { emotion_drops: 80, imagination_seeds: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.emotion_drops >= cost.emotion_drops && gameState.resources.imagination_seeds >= cost.imagination_seeds) {
            gameState.gardenElements.comfortMeadow.built = true;
            const empathyGain = getRandomValue(15, 5);
            const inspirationGain = getRandomValue(10, 3);
            message = `위안의 초원을 건설했습니다! (+${empathyGain} 공감, +${inspirationGain} 영감)`;
            changes.empathy = gameState.empathy + empathyGain;
            changes.inspiration = gameState.inspiration + inspirationGain;
            changes.resources = { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops, imagination_seeds: gameState.resources.imagination_seeds - cost.imagination_seeds };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_starlightObservatory: () => {
        if (!spendActionPoint()) return;
        const cost = { emotion_drops: 50, imagination_seeds: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.emotion_drops >= cost.emotion_drops && gameState.resources.imagination_seeds >= cost.imagination_seeds) {
            gameState.gardenElements.starlightObservatory.built = true;
            message = "별빛 전망대를 건설했습니다!";
            changes.resources = { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops, imagination_seeds: gameState.resources.imagination_seeds - cost.imagination_seeds };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    purify_garden_element: (params) => {
        if (!spendActionPoint()) return;
        const elementKey = params.element;
        const cost = { emotion_drops: 10, imagination_seeds: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.emotion_drops >= cost.emotion_drops && gameState.resources.imagination_seeds >= cost.imagination_seeds) {
            gameState.gardenElements[elementKey].durability = 100;
            message = `${gameState.gardenElements[elementKey].name} 요소의 정화를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops - cost.emotion_drops, imagination_seeds: gameState.resources.imagination_seeds - cost.imagination_seeds };
        } else {
            message = "정화에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    match_story_fragments: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.1) { // Big Win
            const dreamGain = getRandomValue(30, 10);
            const emotionGain = getRandomValue(20, 5);
            const seedGain = getRandomValue(15, 5);
            message = `이야기 조각 대박! 엄청난 자원을 얻었습니다! (+${dreamGain} 꿈 조각, +${emotionGain} 감정의 물방울, +${seedGain} 상상의 씨앗)`;
            changes.resources = { ...gameState.resources, dream_fragments: gameState.resources.dream_fragments + dreamGain, emotion_drops: gameState.resources.emotion_drops + emotionGain, imagination_seeds: gameState.resources.imagination_seeds + seedGain };
        } else if (rand < 0.4) { // Small Win
            const passionGain = getRandomValue(10, 5);
            message = `이야기 조각 맞추기 성공! 열정이 샘솟습니다. (+${passionGain} 열정)`;
            changes.passion = gameState.passion + passionGain;
        } else if (rand < 0.7) { // Small Loss
            const passionLoss = getRandomValue(5, 2);
            message = `아쉽게도 꽝! 열정이 조금 식습니다. (-${passionLoss} 열정)`;
            changes.passion = gameState.passion - passionLoss;
        } else { // No Change
            message = `이야기 조각 맞추기 결과는 아무것도 아니었습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'quiet_contemplation_menu' }, message);
    },
    fish_emotion_river: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.2) { // Big Catch (Starlight)
            const starlightGain = getRandomValue(3, 1);
            message = `감정의 강 낚시 대성공! 별빛을 낚았습니다! (+${starlightGain} 별빛)`;
            changes.resources = { ...gameState.resources, starlight: (gameState.resources.starlight || 0) + starlightGain };
        } else if (rand < 0.6) { // Normal Catch (Emotion Drops)
            const emotionGain = getRandomValue(10, 5);
            message = `감정의 물방울을 낚았습니다! (+${emotionGain} 감정의 물방울)`;
            changes.resources = { ...gameState.resources, emotion_drops: gameState.resources.emotion_drops + emotionGain };
        } else { // No Catch
            message = `아쉽게도 아무것도 낚지 못했습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'quiet_contemplation_menu' }, message);
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 이야기는 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;

        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];

        gameState.currentScenarioId = `minigame_${minigame.name}`;

        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });

        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    show_quiet_contemplation_options: () => updateState({ currentScenarioId: 'quiet_contemplation_menu' }),
};

function applyStatEffects() {
    let message = "";
    // High Creativity: Resource creation success chance increase
    if (gameState.creativity >= 70) {
        gameState.dailyBonus.creationSuccess += 0.1;
        message += "높은 창의력 덕분에 새로운 자원 발견 확률이 증가합니다. ";
    }
    // Low Creativity: Passion decrease
    if (gameState.creativity < 30) {
        gameState.passion = Math.max(0, gameState.passion - getRandomValue(5, 2));
        message += "창의력 고갈로 열정이 감소합니다. ";
    }

    // High Passion: Action points increase
    if (gameState.passion >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "넘치는 열정으로 집중력이 증가합니다. ";
    }
    // Low Passion: Action points decrease
    if (gameState.passion < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "열정이 식어 집중력이 감소합니다. ";
    }

    // High Authenticity: Empathy and Inspiration boost
    if (gameState.authenticity >= 70) {
        const empathyGain = getRandomValue(5, 2);
        const inspirationGain = getRandomValue(5, 2);
        gameState.empathy = Math.min(100, gameState.empathy + empathyGain);
        gameState.inspiration = Math.min(100, gameState.inspiration + inspirationGain);
        message += `당신의 높은 진정성 덕분에 정령들과의 공감대가 깊어지고 영감이 샘솟습니다! (+${empathyGain} 공감, +${inspirationGain} 영감) `;
    }
    // Low Authenticity: Empathy and Inspiration decrease
    if (gameState.authenticity < 30) {
        const empathyLoss = getRandomValue(5, 2);
        const inspirationLoss = getRandomValue(5, 2);
        gameState.empathy = Math.max(0, gameState.empathy - empathyLoss);
        gameState.inspiration = Math.max(0, gameState.inspiration - inspirationLoss);
        message += "진정성이 약화되어 정령들이 동요하고 영감이 흐려집니다. (-${empathyLoss} 공감, -${inspirationLoss} 영감) ";
    }

    // High Inspiration: Creativity boost or rare resource discovery
    if (gameState.inspiration >= 70) {
        const creativityGain = getRandomValue(5, 2);
        gameState.creativity = Math.min(100, gameState.creativity + creativityGain);
        message += "당신의 영감이 새로운 창의력을 불러일으킵니다. (+${creativityGain} 창의성) ";
        if (currentRandFn() < 0.2) { // 20% chance for starlight discovery
            const amount = getRandomValue(1, 1);
            gameState.resources.starlight += amount;
            message += `별빛을 발견했습니다! (+${amount} 별빛) `;
        }
    }
    // Low Inspiration: Creativity decrease or action point loss
    if (gameState.inspiration < 30) {
        const creativityLoss = getRandomValue(5, 2);
        gameState.creativity = Math.max(0, gameState.creativity - creativityLoss);
        message += "영감이 부족하여 창의성이 감소합니다. (-${creativityLoss} 창의성) ";
        if (currentRandFn() < 0.1) { // 10% chance for action point loss
            const actionLoss = getRandomValue(1, 0);
            gameState.actionPoints = Math.max(0, gameState.actionPoints - actionLoss);
            message += "비효율적인 사색으로 집중력을 낭비했습니다. (-${actionLoss} 집중력) ";
        }
    }

    // High Empathy: Spirit trust increase
    if (gameState.empathy >= 70) {
        gameState.spirits.forEach(s => s.trust = Math.min(100, s.trust + getRandomValue(2, 1)));
        message += "높은 공감 지수 덕분에 정령들의 신뢰가 깊어집니다. ";
    }
    // Low Empathy: Spirit trust decrease
    if (gameState.empathy < 30) {
        gameState.spirits.forEach(s => s.trust = Math.max(0, s.trust - getRandomValue(5, 2)));
        message += "낮은 공감 지수로 인해 정령들의 신뢰가 하락합니다. ";
    }

    return message;
}

function generateRandomSpirit() {
    const names = ["미르", "아리", "루", "엘", "이오"];
    const personalities = ["신비로운", "장난기 많은", "현명한", "자유로운"];
    const skills = ["이야기", "음악", "그림"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        trust: 50
    };
}

// --- Daily/Initialization Logic ---
const weightedDailyEvents = [
    { id: "daily_event_creative_drought", weight: 10, condition: () => true, onTrigger: () => {
        const creativityLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_creative_drought.text = `창의적 가뭄이 찾아왔습니다. 정원의 창의성이 감소합니다. (-${creativityLoss} 창의성)`;
        updateState({ creativity: Math.max(0, gameState.creativity - creativityLoss) });
    } },
    { id: "daily_event_new_inspiration", weight: 10, condition: () => true, onTrigger: () => {
        const inspirationGain = getRandomValue(10, 5);
        gameScenarios.daily_event_new_inspiration.text = `새로운 영감이 정원에 가득합니다! 영감이 증가합니다. (+${inspirationGain} 영감)`;
        updateState({ inspiration: gameState.inspiration + inspirationGain });
    } },
    { id: "daily_event_nightmare_invasion", weight: 15, condition: () => true },
    { id: "daily_event_lost_dream_fragment", weight: 7, condition: () => true, onTrigger: () => {
        const dreamLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_lost_dream_fragment.text = `악몽의 잔재로 인해 꿈 조각 일부가 사라졌습니다. (-${dreamLoss} 꿈 조각)`;
        updateState({ resources: { ...gameState.resources, dream_fragments: Math.max(0, gameState.resources.dream_fragments - dreamLoss) } });
    } },
    { id: "daily_event_spirit_conflict", weight: 15, condition: () => gameState.spirits.length >= 2 },
    { id: "daily_event_new_spirit", weight: 10, condition: () => gameState.gardenElements.valueAltar.built && gameState.spirits.length < gameState.maxSpirits, onTrigger: () => {
        const newSpirit = generateRandomSpirit();
        gameState.pendingNewSpirit = newSpirit;
        gameScenarios["daily_event_new_spirit"].text = `새로운 정령 ${newSpirit.name}(${newSpirit.personality}, ${newSpirit.skill})이(가) 정원에 머물고 싶어 합니다. (현재 정령 수: ${gameState.spirits.length} / ${gameState.maxSpirits})`;
    }},
    { id: "daily_event_starlight_shower", weight: 10, condition: () => true, onTrigger: () => {
        const starlightGain = getRandomValue(5, 2);
        gameScenarios.daily_event_starlight_shower.text = `밤하늘에서 별빛이 쏟아져 내립니다! (+${starlightGain} 별빛)`;
        updateState({ resources: { ...gameState.resources, starlight: gameState.resources.starlight + starlightGain } });
    } },
    { id: "daily_event_forgotten_melody", weight: 15, condition: () => true },
    { id: "daily_event_dream_weaver_visit", weight: 10, condition: () => gameState.gardenElements.valueAltar.built },
    { id: "daily_event_creative_block", weight: 12, condition: () => gameState.creativity < 50 },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    // Reset daily actions and action points
    updateState({
        actionPoints: 10, // Reset to base maxActionPoints
        maxActionPoints: 10, // Reset maxActionPoints to base
        dailyActions: { daydreamed: false, communed: false, concertHeld: false, minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { creationSuccess: 0 } // Reset daily bonus
    });

    // Apply stat effects
    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    // Daily skill bonus & durability decay
    gameState.spirits.forEach(s => {
        if (s.skill === '이야기') { gameState.resources.dream_fragments++; skillBonusMessage += `${s.name}의 이야기 덕분에 꿈 조각을 추가로 얻었습니다. `; }
        else if (s.skill === '음악') { gameState.resources.emotion_drops++; skillBonusMessage += `${s.name}의 음악 덕분에 감정의 물방울을 추가로 얻었습니다. `; }
        else if (s.skill === '그림') { gameState.resources.imagination_seeds++; skillBonusMessage += `${s.name}의 그림 덕분에 상상의 씨앗을 추가로 얻었습니다. `; }
    });

    Object.keys(gameState.gardenElements).forEach(key => {
        const element = gameState.gardenElements[key];
        if(element.built) {
            element.durability -= 1;
            if(element.durability <= 0) {
                element.built = false;
                durabilityMessage += `${key} 요소가 스러졌습니다! 정화가 필요합니다. `; 
            }
        }
    });

    gameState.resources.dream_fragments -= gameState.spirits.length * 2; // Dream fragments consumption
    let dailyMessage = "새로운 날이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.dream_fragments < 0) {
        gameState.passion -= 10;
        dailyMessage += "꿈 조각이 부족하여 정령들이 힘들어합니다! (-10 열정)";
    } else {
        dailyMessage += "";
    }

    // Check for game over conditions
    if (gameState.creativity <= 0) { gameState.currentScenarioId = "game_over_creativity"; }
    else if (gameState.passion <= 0) { gameState.currentScenarioId = "game_over_passion"; }
    else if (gameState.authenticity <= 0) { gameState.currentScenarioId = "game_over_authenticity"; }
    else if (gameState.inspiration <= 0) { gameState.currentScenarioId = "game_over_inspiration"; }
    else if (gameState.empathy <= 0) { gameState.currentScenarioId = "game_over_empathy"; }
    else if (gameState.resources.dream_fragments < -(gameState.spirits.length * 5)) { gameState.currentScenarioId = "game_over_resources"; }

    // --- New Weighted Random Event Logic ---
    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
    const rand = currentRandFn() * totalWeight;

    let cumulativeWeight = 0;
    let chosenEvent = null;

    for (const event of possibleEvents) {
        cumulativeWeight += event.weight;
        if (rand < cumulativeWeight) {
            chosenEvent = event;
            break;
        }
    }

    if (chosenEvent) {
        eventId = chosenEvent.id;
        if (chosenEvent.onTrigger) {
            chosenEvent.onTrigger();
        }
    }

    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 꿈의 정원을 포기하시겠습니까? 모든 노력이 사라집니다.")) {
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
