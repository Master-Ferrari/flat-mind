"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const gpthandler_1 = require("gpthandler");
const server_1 = require("./server");
const consoleUtils_1 = require("./consoleUtils");
(async function start() {
    console.log("start...");
    const llm = new gpthandler_1.Llm();
    llm.setOptions({ retryCount: 3, llmModel: gpthandler_1.llmModelsEnum.G4f.gpt3_5_t });
    const memoryMap = new Map();
    const callback = async (message) => {
        const clientId = message.clientId;
        let memory = memoryMap.get(clientId) || {
            lastThought: "",
            longMemory: [],
            shortMemory: [],
        };
        memory.lastThought = message.memory.lastThought;
        memory = { ...memory, ...message.memory };
        (0, consoleUtils_1.printD)({ memory });
        memory = await iteration(llm, memory);
        memoryMap.set(clientId, memory);
        await server.sendToClient(clientId, memory);
    };
    const server = new server_1.Server(3001, callback);
})();
async function iteration(llm, memory) {
    let memoryString = memory.longMemory.join("\n") + "\n" + memory.shortMemory.join("\n");
    const newShortMemory = await llm.requestChat([
        {
            role: "user",
            content: "Сжато изложи три основные мысли из данного размышления. Ничего не выдумывай - только цитируй. Каждую на новой строчке. Никакой нумерации, никаких чёрточек в начале!"
                + "\nСТАРЫЕ МЫСЛИ (не переписывай их):" + "\n" + memoryString
                + "\nРАЗМЫШЛЕНИЕ:" + memory.lastThought
        }
    ]);
    memoryString += "\n" + newShortMemory;
    const newThought = await llm.requestChat([
        {
            role: "user",
            content: "Приступай к задачам обозначенным в размышлении. Подумай что следует дальше. Иди от общего к частному! Рефлексируй о себе."
                + "\nКОНТЕКСТ:" + memoryString
                + "\nРАЗМЫШЛЕНИЕ которое нужно кратко продолжить:"
                + "\n" + memory.lastThought
        }
    ]);
    let newLongMemory = await llm.requestChat([
        {
            role: "user",
            content: "Чего пытается добится человек данным размышлением? Пиши кратко - не более шести слов. Ничего не выдумывай."
                + "\nРАЗМЫШЛЕНИЕ:" + newThought
        }
    ]);
    newLongMemory += " " + await llm.requestChat([
        {
            role: "user",
            content: "Кратко законспектируй размышление - не больше пяти слов. Назови то новое, что было обнаруженно в данном размышлении. Всё сплоным текстом, без заголовков. "
                + "\nРАЗМЫШЛЕНИЕ:" + newThought
        }
    ]);
    const newMemory = {
        lastThought: newThought,
        longMemory: memory.longMemory.concat(newLongMemory),
        shortMemory: [...memory.shortMemory.slice(-5), ...newShortMemory.split("\n")],
    };
    return newMemory;
}
//# sourceMappingURL=index.js.map