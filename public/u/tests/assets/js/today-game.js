// today-game.js - 꿈의 정원 가꾸기 (Tending the Garden of Dreams)

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

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        creativity: 50,
        passion: 50,
        authenticity: 50,
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { dreams: 10, poems: 10, melodies: 5, starlight: 0 },
        spirits: [
            { id: "dewdrop", name: "이슬", personality: "수줍은", skill: "이야기", connection: 70 },
            { id: "sunbeam", name: "햇살", personality: "따뜻한", skill: "음악", connection: 60 }
        ],
        maxSpirits: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { creationSuccess: 0 },
        dailyActions: { daydreamed: false, concertHeld: false, talkedTo: [], minigamePlayed: false },
        elements: {
            fountainOfIdeas: { built: false, durability: 100 },
            groveOfEmotions: { built: false, durability: 100 },
            altarOfValues: { built: false, durability: 100 },
            meadowOfComfort: { built: false, durability: 100 },
            starryObservatory: { built: false, durability: 100 }
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
        if (!loaded.spirits || loaded.spirits.length === 0) {
            loaded.spirits = [
                { id: "dewdrop", name: "이슬", personality: "수줍은", skill: "이야기", connection: 70 },
                { id: "sunbeam", name: "햇살", personality: "따뜻한", skill: "음악", connection: 60 }
            ];
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
    const spiritListHtml = gameState.spirits.map(s => `<li>${s.name} (${s.skill}) - 교감: ${s.connection}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>몽상:</b> ${gameState.day}일차</p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>창의성:</b> ${gameState.creativity} | <b>열정:</b> ${gameState.passion} | <b>진정성:</b> ${gameState.authenticity}</p>
        <p><b>자원:</b> 꿈 조각 ${gameState.resources.dreams}, 시 구절 ${gameState.resources.poems}, 선율 ${gameState.resources.melodies}, 별빛 ${gameState.resources.starlight || 0}</p>
        <p><b>정원 레벨:</b> ${gameState.gardenLevel}</p>
        <p><b>정령 (${gameState.spirits.length}/${gameState.maxSpirits}):</b></p>
        <ul>${spiritListHtml}</ul>
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
    } else if (gameState.currentScenarioId === 'action_facility_management') {
        dynamicChoices = gameScenarios.action_facility_management.choices ? [...gameScenarios.action_facility_management.choices] : [];
        if (!gameState.elements.fountainOfIdeas.built) dynamicChoices.push({ text: "아이디어의 샘 건설 (꿈 조각 50, 선율 20)", action: "build_fountain_of_ideas" });
        if (!gameState.elements.groveOfEmotions.built) dynamicChoices.push({ text: "감정의 숲 조성 (시 구절 30, 선율 30)", action: "build_grove_of_emotions" });
        if (!gameState.elements.altarOfValues.built) dynamicChoices.push({ text: "가치의 제단 설립 (꿈 조각 100, 시 구절 50, 선율 50)", action: "build_altar_of_values" });
        if (!gameState.elements.meadowOfComfort.built) dynamicChoices.push({ text: "위안의 초원 조성 (시 구절 80, 선율 40)", action: "build_meadow_of_comfort" });
        if (gameState.elements.groveOfEmotions.built && gameState.elements.groveOfEmotions.durability > 0 && !gameState.elements.starryObservatory.built) {
            dynamicChoices.push({ text: "별빛 전망대 건설 (시 구절 50, 선율 100)", action: "build_starry_observatory" });
        }
        Object.keys(gameState.elements).forEach(key => {
            const facility = gameState.elements[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${key} 정화 (시 구절 10, 선율 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}'''>${choice.text}</button>`).join('');
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
    "intro": { text: "오늘은 어떤 꿈을 꾸시겠습니까?", choices: [
        { text: "몽상에 잠기기", action: "daydream" },
        { text: "정령과 교감하기", action: "talk_to_spirits" },
        { text: "작은 음악회 열기", action: "hold_concert" },
        { text: "창작 활동", action: "show_resource_collection_options" },
        { text: "정원 요소 관리", action: "show_facility_options" },
        { text: "오늘의 미니게임", action: "play_minigame" }
    ]},
    "daily_event_value_conflict": {
        text: "당신의 신념과 다른 가치관을 가진 정령이 나타나 질문을 던집니다.",
        choices: [
            { text: "나의 신념을 설명한다.", action: "handle_conflict", params: { first: "my_value", second: "other_value" } },
            { text: "그의 가치관을 경청한다.", action: "handle_conflict", params: { first: "other_value", second: "my_value" } },
            { text: "서로의 다름을 인정하고 존중한다.", action: "mediate_conflict" },
            { text: "대화를 피한다.", action: "ignore_event" }
        ]
    },
    "daily_event_creative_block": { text: "창의적인 가뭄이 찾아왔습니다. 영감이 떠오르지 않습니다. (-10 열정)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_inspiration": { text: "밤하늘의 별을 보고 아름다운 시상이 떠올랐습니다. (+10 시 구절)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_lost_melody": {
        text: "슬픔에 잠긴 작은 정령이 잃어버린 멜로디를 찾아달라고 부탁합니다. [꿈 조각 50]을 사용하여 멜로디를 찾아주면 [별빛]을 얻을 수 있습니다.",
        choices: [
            { text: "멜로디를 찾아준다", action: "accept_quest" },
            { text: "다음에 돕겠다", action: "decline_quest" }
        ]
    },
    "daily_event_new_spirit": {
        choices: [
            { text: "따뜻하게 맞이하고 꿈을 나눈다.", action: "welcome_new_unique_spirit" },
            { text: "그의 빛깔을 조용히 지켜본다.", action: "observe_spirit" },
            { text: "정원의 조화와 맞지 않는 것 같다.", action: "reject_spirit" }
        ]
    },
    "game_over_creativity": { text: "창의성이 메마른 정원은 색을 잃고 시들어갑니다.", choices: [], final: true },
    "game_over_passion": { text: "열정이 모두 타버렸습니다. 더 이상 꿈을 꿀 수 없습니다.", choices: [], final: true },
    "game_over_authenticity": { text: "진정성을 잃은 당신의 목소리는 더 이상 누구에게도 닿지 않습니다.", choices: [], final: true },
    "game_over_resources": { text: "모든 꿈과 영감이 사라졌습니다.", choices: [], final: true },
    "action_resource_collection": {
        text: "어떤 창작 활동을 하시겠습니까?",
        choices: [
            { text: "꿈 기록하기 (꿈 조각)", action: "perform_gather_dreams" },
            { text: "시 쓰기 (시 구절)", action: "perform_write_poems" },
            { text: "작곡하기 (선율)", "action": "perform_compose_melodies" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_facility_management": {
        text: "어떤 요소를 관리하시겠습니까?",
        choices: []
    },
    "resource_collection_result": {
        text: "",
        choices: [{ text: "확인", action: "show_resource_collection_options" }]
    },
    "facility_management_result": {
        text: "",
        choices: [{ text: "확인", action: "show_facility_options" }]
    },
    "conflict_resolution_result": {
        text: "",
        choices: [{ text: "확인", action: "return_to_intro" }]
    }
};

function calculateMinigameReward(minigameName, score) {
    let rewards = { creativity: 0, passion: 0, authenticity: 0, message: "" };

    switch (minigameName) {
        case "기억력 순서 맞추기":
            if (score >= 51) {
                rewards.creativity = 15;
                rewards.passion = 10;
                rewards.authenticity = 5;
                rewards.message = `완벽한 기억력입니다! 모든 꿈의 조각을 기억했습니다. (+15 창의성, +10 열정, +5 진정성)`;
            } else if (score >= 21) {
                rewards.creativity = 10;
                rewards.passion = 5;
                rewards.message = `훌륭한 기억력입니다. (+10 창의성, +5 열정)`;
            } else if (score >= 0) {
                rewards.creativity = 5;
                rewards.message = `훈련을 완료했습니다. (+5 창의성)`;
            } else {
                rewards.message = `훈련을 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        case "이야기 만들기":
            rewards.creativity = 10;
            rewards.message = `아름다운 이야기가 탄생했습니다! (+10 창의성)`;
            break;
        case "감정 그림 그리기":
            rewards.passion = 10;
            rewards.message = `당신의 감정이 그림에 잘 표현되었습니다. (+10 열정)`;
            break;
        case "이상적인 세계 설계":
            rewards.authenticity = 10;
            rewards.message = `당신의 진정한 가치가 담긴 세계입니다. (+10 진정성)`;
            break;
        case "숨겨진 의미 찾기":
            rewards.creativity = 5;
            rewards.authenticity = 5;
            rewards.message = `사물에 담긴 숨겨진 의미를 발견했습니다. (+5 창의성, +5 진정성)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}을(를) 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "기억력 순서 맞추기",
        description: "화면에 나타나는 꿈의 조각 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { currentSequence: [], playerInput: [], stage: 1, score: 0, showingSequence: false };
            minigames[0].render(gameArea, choicesDiv);
            minigames[0].showSequence();
        },
        render: (gameArea, choicesDiv) => {
            gameArea.innerHTML = `
                <p><b>단계:</b> ${gameState.minigameState.stage} | <b>점수:</b> ${gameState.minigameState.score}</p>
                <p id="sequenceDisplay" style="font-size: 2em; font-weight: bold; min-height: 1.5em;"></p>
                <p>순서를 기억하고 입력하세요:</p>
                <div id="playerInputDisplay" style="font-size: 1.5em; min-height: 1.5em;">${gameState.minigameState.playerInput.join(' ')}</div>
            `;
            choicesDiv.innerHTML = `
                <div class="number-pad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `<button class="choice-btn num-btn" data-value="${num}">${num}</button>`).join('')}
                    <button class="choice-btn num-btn" data-value="0">0</button>
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.num-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const sequenceLength = gameState.minigameState.stage + 2;
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(Math.floor(currentRandFn() * 10));
            }

            const sequenceDisplay = document.getElementById('sequenceDisplay');
            let i = 0;
            const interval = setInterval(() => {
                if (i < gameState.minigameState.currentSequence.length) {
                    sequenceDisplay.innerText = gameState.minigameState.currentSequence[i];
                    i++;
                } else {
                    clearInterval(interval);
                    sequenceDisplay.innerText = "입력하세요!";
                    gameState.minigameState.showingSequence = false;
                }
            }, 800);
        },
        processAction: (actionType, value = null) => {
            if (gameState.minigameState.showingSequence) return;

            if (actionType === 'addInput') {
                gameState.minigameState.playerInput.push(parseInt(value));
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((num, i) => num === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("오답입니다. 게임 종료.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                creativity: gameState.creativity + rewards.creativity,
                passion: gameState.passion + rewards.passion,
                authenticity: gameState.authenticity + rewards.authenticity,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    { name: "이야기 만들기", description: "주어진 키워드로 짧은 이야기를 만들어보세요.", start: (ga, cd) => { ga.innerHTML = "<p>이야기 만들기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[1].end()'>종료</button>"; gameState.minigameState = { score: 10 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[1].name, gameState.minigameState.score); updateState({ creativity: gameState.creativity + r.creativity, passion: gameState.passion + r.passion, authenticity: gameState.authenticity + r.authenticity, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "감정 그림 그리기", description: "주어진 감정을 색과 형태로 표현해보세요.", start: (ga, cd) => { ga.innerHTML = "<p>감정 그림 그리기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[2].end()'>종료</button>"; gameState.minigameState = { score: 15 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[2].name, gameState.minigameState.score); updateState({ creativity: gameState.creativity + r.creativity, passion: gameState.passion + r.passion, authenticity: gameState.authenticity + r.authenticity, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "이상적인 세계 설계", description: "당신이 꿈꾸는 이상적인 세계의 규칙을 만들어보세요.", start: (ga, cd) => { ga.innerHTML = "<p>이상적인 세계 설계 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[3].end()'>종료</button>"; gameState.minigameState = { score: 20 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[3].name, gameState.minigameState.score); updateState({ creativity: gameState.creativity + r.creativity, passion: gameState.passion + r.passion, authenticity: gameState.authenticity + r.authenticity, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "숨겨진 의미 찾기", description: "평범한 사물에 담긴 숨겨진 의미를 찾아내세요.", start: (ga, cd) => { ga.innerHTML = "<p>숨겨진 의미 찾기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[4].end()'>종료</button>"; gameState.minigameState = { score: 25 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[4].name, gameState.minigameState.score); updateState({ creativity: gameState.creativity + r.creativity, passion: gameState.passion + r.passion, authenticity: gameState.authenticity + r.authenticity, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } }
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
        if (gameState.dailyActions.daydreamed) { updateState({ dailyActions: { ...gameState.dailyActions, daydreamed: true } }, "오늘은 이미 충분히 몽상에 잠겼습니다."); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, daydreamed: true } };
        let message = "몽상에 잠겨 새로운 아이디어를 탐색합니다.";
        const rand = currentRandFn();
        if (rand < 0.3) { message += " 아름다운 시상이 떠올랐습니다. (+2 시 구절)"; changes.resources = { ...gameState.resources, poems: gameState.resources.poems + 2 }; }
        else if (rand < 0.6) { message += " 새로운 멜로디가 들려옵니다. (+2 선율)"; changes.resources = { ...gameState.resources, melodies: gameState.resources.melodies + 2 }; }
        else { message += " 특별한 영감은 없었습니다."; }
        
        updateState(changes, message);
    },
    talk_to_spirits: () => {
        if (!spendActionPoint()) return;
        const spirit = gameState.spirits[Math.floor(currentRandFn() * gameState.spirits.length)];
        if (gameState.dailyActions.talkedTo.includes(spirit.id)) { updateState({ dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, spirit.id] } }, `${spirit.name}${getWaGwaParticle(spirit.name)} 이미 깊은 교감을 나누었습니다.`); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, spirit.id] } };
        let message = `${spirit.name}${getWaGwaParticle(spirit.name)} 교감했습니다. `;
        if (spirit.connection > 80) { message += `그와의 대화를 통해 당신의 진정성이 깊어졌습니다. (+5 진정성)`; changes.authenticity = gameState.authenticity + 5; }
        else if (spirit.connection < 40) { message += `그는 아직 당신에게 마음을 열지 않았습니다. (-5 열정)`; changes.passion = gameState.passion - 5; }
        else { message += `그와의 교감을 통해 창의성이 샘솟습니다. (+2 창의성)`; changes.creativity = gameState.creativity + 2; }
        
        updateState(changes, message);
    },
    hold_concert: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.concertHeld) {
            const message = "오늘은 이미 작은 음악회를 열었습니다. (-5 열정)";
            gameState.passion -= 5;
            updateState({ passion: gameState.passion }, message);
            return;
        }
        updateState({ dailyActions: { ...gameState.dailyActions, concertHeld: true } });
        const rand = currentRandFn();
        let message = "작은 음악회를 열었습니다. ";
        if (rand < 0.5) { message += "정령들이 당신의 음악에 감동했습니다. (+10 열정, +5 진정성)"; updateState({ passion: gameState.passion + 10, authenticity: gameState.authenticity + 5 }); }
        else { message += "음악을 통해 정령들과 깊이 교감했습니다. (+5 창의성)"; updateState({ creativity: gameState.creativity + 5 }); }
        updateGameDisplay(message);
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
    handle_conflict: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { creativity: 0, passion: 0, authenticity: 0 };
        
        if (first === "my_value") {
            message = "당신의 신념을 굳건히 지켰습니다. (+5 진정성)";
            reward.authenticity += 5;
            reward.passion -= 2;
        } else {
            message = "타인의 가치관을 수용했습니다. (+5 열정)";
            reward.passion += 5;
            reward.authenticity -= 2;
        }
        
        updateState({ ...reward, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    mediate_conflict: () => {
        if (!spendActionPoint()) return;
        const message = "서로의 다름을 인정하고 존중하며 더 높은 차원의 조화를 이루었습니다. (+10 열정, +5 창의성)";
        updateState({ passion: gameState.passion + 10, creativity: gameState.creativity + 5, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const message = "대화를 피했습니다. 내면의 갈등이 깊어집니다. (-10 열정, -5 진정성)";
        updateState({ passion: gameState.passion - 10, authenticity: gameState.authenticity - 5, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    show_resource_collection_options: () => updateState({ currentScenarioId: 'action_resource_collection' }),
    show_facility_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    perform_gather_dreams: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.gardenLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "꿈 조각을 수집했습니다! (+5 꿈 조각)";
            changes.resources = { ...gameState.resources, dreams: gameState.resources.dreams + 5 };
        } else {
            message = "꿈 조각을 수집하지 못했습니다.";
        }
        updateState(changes, message);
    },
    perform_write_poems: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.gardenLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "아름다운 시 구절을 완성했습니다! (+5 시 구절)";
            changes.resources = { ...gameState.resources, poems: gameState.resources.poems + 5 };
        } else {
            message = "시상이 떠오르지 않았습니다.";
        }
        updateState(changes, message);
    },
    perform_compose_melodies: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.gardenLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "감미로운 선율을 작곡했습니다! (+5 선율)";
            changes.resources = { ...gameState.resources, melodies: gameState.resources.melodies + 5 };
        } else {
            message = "선율을 완성하지 못했습니다.";
        }
        updateState(changes, message);
    },
    build_fountain_of_ideas: () => {
        if (!spendActionPoint()) return;
        const cost = { dreams: 50, melodies: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.melodies >= cost.melodies && gameState.resources.dreams >= cost.dreams) {
            gameState.elements.fountainOfIdeas.built = true;
            message = "아이디어의 샘을 건설했습니다!";
            changes.authenticity = gameState.authenticity + 10;
            changes.resources = { ...gameState.resources, melodies: gameState.resources.melodies - cost.melodies, dreams: gameState.resources.dreams - cost.dreams };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_grove_of_emotions: () => {
        if (!spendActionPoint()) return;
        const cost = { poems: 30, melodies: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.poems >= cost.poems && gameState.resources.melodies >= cost.melodies) {
            gameState.elements.groveOfEmotions.built = true;
            message = "감정의 숲을 조성했습니다!";
            changes.passion = gameState.passion + 10;
            changes.resources = { ...gameState.resources, poems: gameState.resources.poems - cost.poems, melodies: gameState.resources.melodies - cost.melodies };
        } else {
            message = "자원이 부족하여 조성할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_altar_of_values: () => {
        if (!spendActionPoint()) return;
        const cost = { dreams: 100, poems: 50, melodies: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.poems >= cost.poems && gameState.resources.melodies >= cost.melodies && gameState.resources.dreams >= cost.dreams) {
            gameState.elements.altarOfValues.built = true;
            message = "가치의 제단을 설립했습니다!";
            changes.authenticity = gameState.authenticity + 20;
            changes.passion = gameState.passion + 20;
            changes.resources = { ...gameState.resources, poems: gameState.resources.poems - cost.poems, melodies: gameState.resources.melodies - cost.melodies, dreams: gameState.resources.dreams - cost.dreams };
        } else {
            message = "자원이 부족하여 설립할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_meadow_of_comfort: () => {
        if (!spendActionPoint()) return;
        const cost = { poems: 80, melodies: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.poems >= cost.poems && gameState.resources.melodies >= cost.melodies) {
            gameState.elements.meadowOfComfort.built = true;
            message = "위안의 초원을 조성했습니다!";
            changes.creativity = gameState.creativity + 15;
            changes.authenticity = gameState.authenticity + 10;
            changes.resources = { ...gameState.resources, poems: gameState.resources.poems - cost.poems, melodies: gameState.resources.melodies - cost.melodies };
        } else {
            message = "자원이 부족하여 조성할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_starry_observatory: () => {
        if (!spendActionPoint()) return;
        const cost = { poems: 50, melodies: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.poems >= cost.poems && gameState.resources.melodies >= cost.melodies) {
            gameState.elements.starryObservatory.built = true;
            message = "별빛 전망대를 건설했습니다!";
            changes.resources = { ...gameState.resources, poems: gameState.resources.poems - cost.poems, melodies: gameState.resources.melodies - cost.melodies };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_facility: (params) => {
        if (!spendActionPoint()) return;
        const facilityKey = params.facility;
        const cost = { poems: 10, melodies: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.poems >= cost.poems && gameState.resources.melodies >= cost.melodies) {
            gameState.elements[facilityKey].durability = 100;
            message = `${facilityKey} 요소의 정화를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, poems: gameState.resources.poems - cost.poems, melodies: gameState.resources.melodies - cost.melodies };
        } else {
            message = "정화에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    upgrade_garden: () => {
        if (!spendActionPoint()) return;
        const cost = 20 * (gameState.gardenLevel + 1);
        if (gameState.resources.poems >= cost && gameState.resources.melodies >= cost) {
            gameState.gardenLevel++;
            updateState({ resources: { ...gameState.resources, poems: gameState.resources.poems - cost, melodies: gameState.resources.melodies - cost }, gardenLevel: gameState.gardenLevel });
            updateGameDisplay(`정원을 업그레이드했습니다! 모든 창작 활동 성공률이 10% 증가합니다. (현재 레벨: ${gameState.gardenLevel})`);
        } else { updateGameDisplay(`업그레이드에 필요한 자원이 부족합니다. (시 구절 ${cost}, 선율 ${cost} 필요)`); }
        updateState({ currentScenarioId: 'intro' });
    },
    review_dreams: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) { updateState({ resources: { ...gameState.resources, poems: gameState.resources.poems + 20, melodies: gameState.resources.melodies + 20 } }); updateGameDisplay("과거의 꿈을 되짚어보다 잊혀진 영감을 발견했습니다! (+20 시 구절, +20 선율)"); }
        else if (rand < 0.5) { updateState({ creativity: gameState.creativity + 10, authenticity: gameState.authenticity + 10 }); updateGameDisplay("과거의 꿈에서 진정한 자아를 발견했습니다. (+10 창의성, +10 진정성)"); }
        else { updateGameDisplay("과거의 꿈을 되짚어보았지만, 특별한 것은 발견하지 못했습니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    accept_quest: () => {
        if (!spendActionPoint()) return;
        if (gameState.resources.dreams >= 50) {
            updateState({ resources: { ...gameState.resources, dreams: gameState.resources.dreams - 50, starlight: (gameState.resources.starlight || 0) + 1 } });
            updateGameDisplay("잃어버린 멜로디를 찾아주어 별빛을 얻었습니다! 정원의 진정성이 깊어집니다.");
        } else { updateGameDisplay("멜로디를 찾는 데 필요한 꿈 조각이 부족합니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    decline_quest: () => {
        if (!spendActionPoint()) return;
        updateGameDisplay("정령의 부탁을 거절했습니다. 다음 기회를 기다려야겠습니다.");
        updateState({ currentScenarioId: 'intro' });
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 미니게임은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;
        
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } }); 
        
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    }
};

function applyStatEffects() {
    let message = "";
    if (gameState.creativity >= 70) {
        gameState.dailyBonus.creationSuccess += 0.1;
        message += "넘치는 창의성 덕분에 창작 활동 성공률이 증가합니다. ";
    }
    if (gameState.creativity < 30) {
        gameState.spirits.forEach(s => s.connection = Math.max(0, s.connection - 5));
        message += "창의성이 메마르자 정령들과의 교감이 약해집니다. ";
    }

    if (gameState.passion >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "불타는 열정 덕분에 하루에 더 많은 활동을 할 수 있습니다. ";
    }
    if (gameState.passion < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "열정이 식어 활동에 제약이 생깁니다. ";
    }

    if (gameState.authenticity >= 70) {
        Object.keys(gameState.elements).forEach(key => {
            if (gameState.elements[key].built) gameState.elements[key].durability = Math.min(100, gameState.elements[key].durability + 1);
        });
        message += "깊은 진정성 덕분에 정원의 요소들이 더욱 견고해집니다. ";
    }
    if (gameState.authenticity < 30) {
        Object.keys(gameState.elements).forEach(key => {
            if (gameState.elements[key].built) gameState.elements[key].durability = Math.max(0, gameState.elements[key].durability - 2);
        });
        message += "진정성이 흔들려 정원의 요소들이 빠르게 스러집니다. ";
    }
    return message;
}

function generateRandomSpirit() {
    const names = ["메아리", "속삭임", "그림자", "물결"];
    const personalities = ["몽환적인", "내성적인", "자유로운", "따뜻한"];
    const skills = ["이야기", "음악", "그림", "치유"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        connection: 50
    };
}

// --- Daily/Initialization Logic ---
function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    updateState({
        actionPoints: 10,
        maxActionPoints: 10,
        dailyActions: { daydreamed: false, concertHeld: false, talkedTo: [], minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { creationSuccess: 0 }
    });

    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    gameState.spirits.forEach(s => {
        if (s.skill === '이야기') { gameState.resources.dreams++; skillBonusMessage += `${s.name}의 이야기 덕분에 꿈 조각을 추가로 얻었습니다. `; }
        else if (s.skill === '음악') { gameState.resources.melodies++; skillBonusMessage += `${s.name}의 연주 덕분에 선율을 추가로 얻었습니다. `; }
        else if (s.skill === '그림') { gameState.resources.poems++; skillBonusMessage += `${s.name}의 그림에서 새로운 시상을 얻었습니다. `; }
    });

    Object.keys(gameState.elements).forEach(key => {
        const facility = gameState.elements[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${key} 요소가 스러졌습니다! 재건이 필요합니다. `; 
            }
        }
    });

    gameState.resources.dreams -= gameState.spirits.length * 2;
    let dailyMessage = "새로운 꿈의 날이 밝았습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.dreams < 0) {
        gameState.passion -= 10;
        dailyMessage += "꿈 조각이 부족하여 열정이 식어갑니다! (-10 열정)";
    }
    
    const rand = currentRandFn();
    let eventId = "intro";
    if (rand < 0.15) { eventId = "daily_event_creative_block"; updateState({resources: {...gameState.resources, passion: Math.max(0, gameState.resources.passion - 10)}}); }
    else if (rand < 0.30) { eventId = "daily_event_inspiration"; updateState({resources: {...gameState.resources, poems: gameState.resources.poems + 10}}); }
    else if (rand < 0.5 && gameState.spirits.length >= 2) { eventId = "daily_event_value_conflict"; }
    else if (rand < 0.7 && gameState.elements.altarOfValues.built && gameState.spirits.length < gameState.maxSpirits) {
        eventId = "daily_event_new_spirit";
        const newSpirit = generateRandomSpirit();
        gameState.pendingNewSpirit = newSpirit;
        gameScenarios["daily_event_new_spirit"].text = `새로운 정령 ${newSpirit.name}(${newSpirit.personality}, ${newSpirit.skill})이(가) 정원에 나타났습니다. (현재 정령 수: ${gameState.spirits.length} / ${gameState.maxSpirits})`;
    }
    else if (rand < 0.85 && gameState.elements.altarOfValues.built) { eventId = "daily_event_lost_melody"; }
    
    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 정원을 초기화하시겠습니까? 모든 꿈과 영감이 사라집니다.")) {
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
