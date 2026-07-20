/* People Book application. */
window.Intl = window.Intl || {};
      Intl.t = function (s) {
        return (Intl._locale && Intl._locale[s]) || s;
      };

(() => {
        // --- Data ---
        const prefixes = [
          "Cyber",
          "Lunar",
          "Neon",
          "Shadow",
          "Glitch",
          "Pixel",
          "Solar",
          "Void",
          "Frost",
          "Echo",
          "Turbo",
          "Mystic",
          "Cosmic",
          "Aqua",
          "Blaze",
          "Storm",
          "Nova",
          "Zen",
          "Dusk",
          "Arc",
        ];
        const cores = [
          "Otter",
          "Phoenix",
          "Nova",
          "Byte",
          "Sage",
          "Echo",
          "Panda",
          "Fox",
          "Dragon",
          "Wolf",
          "Kitten",
          "Shark",
          "Tiger",
          "Ghost",
          "Raven",
          "Cobra",
          "Falcon",
          "Bear",
          "Lynx",
          "Owl",
        ];
        const suffixes = [
          "Prime",
          "X",
          "Mage",
          "Core",
          "99",
          "3000",
          "Void",
          "Spark",
          "Blade",
          "Flux",
          "Zero",
          "Nova",
          "Pro",
          "Dash",
          "Wave",
          "Wing",
          "OP",
          "XD",
          "HD",
          "Max",
        ];
        const statusTexts = [
          "Wants to trade",
          "Online in Arena",
          "Sent you a gift",
          "Challenged you to duel",
          "Just leveled up",
          "Looking for squad",
          "Streaming now",
          "AFK farming",
          "Has rare loot",
          "Wants to be friends",
          "Hosting event",
          "New avatar unlocked",
          "Playing ranked",
          "In voice chat",
          "Browsing shop",
        ];
        const chatMessages = [
          "gg!",
          "wanna trade?",
          "lol brb",
          "add me back!",
          "nice profile",
          "duel later?",
          "ty for add",
          "yo what's up",
          "let's team!",
          "join my lobby",
          "ez clap",
          "Neo Nyke rules play with me ? https://neonyke.davidkozdra.workers.dev/ ? ",
          "Neo Nyke rules play with me ? https://neonyke.davidkozdra.workers.dev/ ? ",
          "Neo Nyke rules play with me ? https://neonyke.davidkozdra.workers.dev/ ? ",
          "Neo Nyke rules play with me ? https://neonyke.davidkozdra.workers.dev/ ? ",
          "brb dinner",
          "u on later?",
          "no way lol",
          "that was sick",
          "ggs",
          "hold on sec",
          "omw",
          "i got wrecked",
          "nice one!",
          "lmaooo",
          "wait what",
          "lets goooo",
          "inv me",
          "1v1 in tetris?",
          "bro chill",
          "haha yeah fr fr & shi ",
          "send it",
          "nah im good",
          "fr fr",
          "bet",
          "say less",
          "lowkey fire",
          "im lagging",
          "carry me pls",
          "whats ur rank",
          "sick avatar btw",
          "just got a new hat lol",
          "check my drip",
          "your character looks fire",
          "yGSJSj9 - Smudge",
        ];

        const feedPosts = [
          "just hit level 50 no cap 🔥",
          "anyone wanna squad up rn?",
          "new cosmetic is fire ngl",
          "why is everyone so sweaty today",
          "finally got the crown 👑",
          "grinding coins all day",
          "my character looks insane rn",
          "who else is bored",
          "rate my fit 1-10",
          "just added 20 people lol",
          "this game is actually addicting",
          "ggs to everyone i played today",
          "need more coins for the cape 😭",
          "lowkey the best game ever",
          "anyone got tips for leveling?",
          "just got a gift from a stranger?!",
          "the wizard hat is worth it trust",
          "brb gonna go touch grass",
          "3 day streak lets goooo",
          "who designed these avatars they go hard",
          "finally saved up 500 coins",
          "the VR glasses are cracked",
          "my collection is insane",
          "vibing in the shop rn",
          "someone send me a gift pls",
          "just discovered the feed lol",
          "posting from my new account hi",
          "this is giving club penguin vibes",
          "the armor shirt is so clean",
          "anyone else a tycoon yet?",
        ];
        const statusActions = [
          "Grinding",
          "Queueing",
          "Streaming",
          "Testing",
          "Collecting",
          "Crafting",
          "Trading",
          "Editing",
          "Climbing",
          "Speedrunning",
        ];
        const statusContexts = [
          "ranked",
          "duos",
          "arena",
          "the shop",
          "daily quests",
          "the event",
          "new loadout",
          "guild chat",
          "practice mode",
          "boss run",
        ];
        const chatOpeners = [
          "yo",
          "hey",
          "ay",
          "bro",
          "bestie",
          "ngl",
          "fr",
          "wait",
          "ok",
          "nah",
        ];
        const chatIntents = [
          "run duos",
          "trade skins",
          "queue ranked",
          "check my new fit",
          "send invite",
          "join vc",
          "farm coins",
          "do quests",
          "1v1 now",
          "rate this build",
        ];


        const chatOptions = new ChatOptionsManager();
        const SEMANTIC_CHAT_INTENTS = chatOptions.get();
        const GAME_CATALOG = [
          {
            id: "paddle-clash",
            title: "Paddle Clash",
            tagline: "Swing-powered pong duels",
            description: "Track the ball with your paddle, then hit Space at the right moment to swing for a powerful return.",
            price: 0,
            reward: 30,
            loss: 8,
            file: "games/paddle-clash.html?v=20260720-4",
            art: "paddle",
            controls: "Move: mouse / touch · Swing: Space",
          },
          {
            id: "skyline-sprint",
            title: "Skyline Sprint",
            tagline: "A rooftop race to the finish",
            description: "Outrun your rival over floating platforms. Move with A/D or arrows and use Space for a burst dash.",
            price: 90,
            reward: 45,
            loss: 12,
            file: "games/skyline-sprint.html?v=20260720-8",
            art: "sprint",
            controls: "Move: A/D or arrows · Dash: Space",
          },
          {
            id: "neon-showdown",
            title: "Neon Showdown",
            tagline: "Dash, dodge, and outshoot",
            description: "Pick a weapon, dodge enemy fire, and land the final hit in a neon arena.",
            price: 150,
            reward: 65,
            loss: 18,
            file: "games/neon-showdown.html?v=20260720-9",
            art: "showdown",
            controls: "Move: WASD / arrows · Fire: click · Dash: Space",
          },
        ];
        const BOT_PERSONALITIES = [
          { id: "competitive", difficulty: 0.83, acceptChance: 0.96 },
          { id: "fun", difficulty: 0.58, acceptChance: 0.82 },
          { id: "random", difficulty: 0.67, acceptChance: 0.7 },
          { id: "rookie", difficulty: 0.32, acceptChance: 0.76 },
        ];
        const feedLeads = [
          "daily update:",
          "hot take:",
          "small flex:",
          "ngl",
          "PSA:",
          "real talk:",
          "question:",
          "patch notes from me:",
          "status:",
          "today:",
        ];
        const feedActions = [
          "hit a new streak",
          "pulled rare loot",
          "finally hit my goal",
          "found a broken combo",
          "finished my grind",
          "unlocked a cosmetic",
          "made a new squad",
          "won three in a row",
          "fixed my build",
          "maxed another stat",
        ];
        const feedClosers = [
          "W day",
          "im actually cooking",
          "someone stop me",
          "this game has me hooked",
          "lowkey insane",
          "we move",
          "back to the grind",
          "feels good",
          "huge W",
          "im happy rn",
        ];

        function maybe(probability) {
          return Math.random() < probability;
        }

        // --- Cosmetics catalog ---
        const COSMETICS = {
          skin: {
            label: "Skin Color",
            items: [
              { id: "skin_default", name: "Default", emoji: "😶", price: 0 },
              { id: "skin_tan", name: "Tan", emoji: "🫠", price: 0 },
              { id: "skin_pale", name: "Pale", emoji: "🤍", price: 0 },
              { id: "skin_dark", name: "Dark", emoji: "🤎", price: 0 },
              { id: "skin_gold", name: "Golden", emoji: "✨", price: 50 },
              { id: "skin_alien", name: "Alien", emoji: "👽", price: 150 },
              { id: "skin_robot", name: "Robot", emoji: "🤖", price: 200 },
              { id: "skin_ghost", name: "Ghost", emoji: "👻", price: 300 },
            ],
          },
          eyes: {
            label: "Eyes",
            items: [
              { id: "eyes_default", name: "Normal", emoji: "👀", price: 0 },
              { id: "eyes_star", name: "Star", emoji: "🤩", price: 30 },
              { id: "eyes_heart", name: "Heart", emoji: "😍", price: 40 },
              { id: "eyes_cool", name: "Cool", emoji: "😎", price: 50 },
              { id: "eyes_angry", name: "Angry", emoji: "😠", price: 60 },
              { id: "eyes_wink", name: "Wink", emoji: "😉", price: 70 },
              { id: "eyes_cry", name: "Tears", emoji: "🥹", price: 80 },
              { id: "eyes_fire", name: "Fire", emoji: "🔥", price: 120 },
            ],
          },
          nose: {
            label: "Nose",
            items: [
              { id: "nose_default", name: "None", emoji: "·", price: 0 },
              { id: "nose_clown", name: "Clown", emoji: "🔴", price: 40 },
              { id: "nose_pig", name: "Pig", emoji: "🐽", price: 50 },
              { id: "nose_dog", name: "Dog", emoji: "🐶", price: 60 },
            ],
          },
          hair: {
            label: "Hair",
            items: [
              { id: "hair_default", name: "None", emoji: "·", price: 0 },
              { id: "hair_spiky", name: "Spiky", emoji: "⚡", price: 30 },
              { id: "hair_curly", name: "Curly", emoji: "🌀", price: 40 },
              { id: "hair_long", name: "Long", emoji: "💇", price: 50 },
              { id: "hair_flame", name: "Flame", emoji: "🔥", price: 100 },
              { id: "hair_rainbow", name: "Rainbow", emoji: "🌈", price: 200 },
            ],
          },
          hat: {
            label: "Hat",
            items: [
              { id: "hat_default", name: "None", emoji: "·", price: 0 },
              { id: "hat_cap", name: "Cap", emoji: "🧢", price: 30 },
              { id: "hat_top", name: "Top Hat", emoji: "🎩", price: 60 },
              { id: "hat_crown", name: "Crown", emoji: "👑", price: 150 },
              { id: "hat_party", name: "Party", emoji: "🎉", price: 80 },
              { id: "hat_cowboy", name: "Cowboy", emoji: "🤠", price: 90 },
              { id: "hat_wizard", name: "Wizard", emoji: "🧙", price: 200 },
              { id: "hat_halo", name: "Halo", emoji: "😇", price: 250 },
            ],
          },
          glasses: {
            label: "Glasses",
            items: [
              { id: "glasses_default", name: "None", emoji: "·", price: 0 },
              { id: "glasses_nerd", name: "Nerd", emoji: "🤓", price: 30 },
              { id: "glasses_sun", name: "Shades", emoji: "🕶️", price: 50 },
              {
                id: "glasses_monocle",
                name: "Monocle",
                emoji: "🧐",
                price: 80,
              },
              { id: "glasses_3d", name: "3D", emoji: "👓", price: 60 },
              { id: "glasses_vr", name: "VR", emoji: "🥽", price: 150 },
            ],
          },
          shirt: {
            label: "Shirt",
            items: [
              { id: "shirt_default", name: "Basic", emoji: "👕", price: 0 },
              { id: "shirt_hoodie", name: "Hoodie", emoji: "🧥", price: 40 },
              { id: "shirt_suit", name: "Suit", emoji: "🤵", price: 80 },
              { id: "shirt_armor", name: "Armor", emoji: "🛡️", price: 150 },
              { id: "shirt_tux", name: "Tuxedo", emoji: "🎭", price: 120 },
              { id: "shirt_jersey", name: "Jersey", emoji: "🏅", price: 70 },
              { id: "shirt_cape", name: "Cape", emoji: "🦸", price: 200 },
              { id: "shirt_space", name: "Space", emoji: "🚀", price: 300 },
            ],
          },
        };

        // --- Gifts ---
        const GIFT_TYPES = [
          { emoji: "🎁", name: "Mystery Box", coins: 5, xp: 3 },
          { emoji: "💎", name: "Gem", coins: 15, xp: 5 },
          { emoji: "🧁", name: "Cupcake", coins: 3, xp: 2 },
          { emoji: "🎮", name: "Game Key", coins: 10, xp: 4 },
          { emoji: "🌟", name: "Star Fragment", coins: 8, xp: 6 },
          { emoji: "🍕", name: "Pizza Slice", coins: 4, xp: 2 },
          { emoji: "🎵", name: "Mixtape", coins: 6, xp: 3 },
          { emoji: "🔮", name: "Crystal Ball", coins: 12, xp: 5 },
          { emoji: "🧸", name: "Teddy Bear", coins: 7, xp: 3 },
          { emoji: "🏆", name: "Mini Trophy", coins: 20, xp: 8 },
        ];
        const GIFT_MIN_MS = 5 * 60 * 1000; // 5 minutes
        const GIFT_MAX_MS = 20 * 60 * 1000; // 20 minutes

        const XP_PER_LEVEL = 50;

        const ACHIEVEMENTS = [
          {
            id: "first_friend",
            name: "First Friend",
            desc: "Add your first contact",
            check: (s) => s.contactsAdded >= 1,
            reward: 20,
          },
          {
            id: "social_5",
            name: "Social Butterfly",
            desc: "Add 5 friends",
            check: (s) => s.contactsAdded >= 5,
            reward: 50,
          },
          {
            id: "social_20",
            name: "Networker",
            desc: "Add 20 friends",
            check: (s) => s.contactsAdded >= 20,
            reward: 100,
          },
          {
            id: "social_50",
            name: "Influencer",
            desc: "Add 50 friends",
            check: (s) => s.contactsAdded >= 50,
            reward: 250,
          },
          {
            id: "chat_1",
            name: "First Chat",
            desc: "Send your first message",
            check: (s) => s.messagesSent >= 1,
            reward: 15,
          },
          {
            id: "chat_20",
            name: "Chatterbox",
            desc: "Send 20 messages",
            check: (s) => s.messagesSent >= 20,
            reward: 80,
          },
          {
            id: "chat_100",
            name: "Keyboard Warrior",
            desc: "Send 100 messages",
            check: (s) => s.messagesSent >= 100,
            reward: 200,
          },
          {
            id: "coins_100",
            name: "Coin Collector",
            desc: "Earn 100 coins total",
            check: (s) => s.totalCoins >= 100,
            reward: 30,
          },
          {
            id: "coins_500",
            name: "Rich Kid",
            desc: "Earn 500 coins total",
            check: (s) => s.totalCoins >= 500,
            reward: 100,
          },
          {
            id: "coins_2000",
            name: "Tycoon",
            desc: "Earn 2000 coins total",
            check: (s) => s.totalCoins >= 2000,
            reward: 300,
          },
          {
            id: "level_5",
            name: "Rising Star",
            desc: "Reach level 5",
            check: (s) => s.level >= 5,
            reward: 50,
          },
          {
            id: "level_10",
            name: "Veteran",
            desc: "Reach level 10",
            check: (s) => s.level >= 10,
            reward: 150,
          },
          {
            id: "shop_1",
            name: "Fashionista",
            desc: "Buy your first cosmetic",
            check: (s) => s.itemsBought >= 1,
            reward: 25,
          },
          {
            id: "shop_10",
            name: "Dripped Out",
            desc: "Buy 10 cosmetics",
            check: (s) => s.itemsBought >= 10,
            reward: 150,
          },
          {
            id: "streak_3",
            name: "On a Roll",
            desc: "3 day streak",
            check: (s) => s.streak >= 3,
            reward: 50,
          },
          {
            id: "streak_7",
            name: "Dedicated",
            desc: "7 day streak",
            check: (s) => s.streak >= 7,
            reward: 150,
          },
          {
            id: "gift_1",
            name: "Gift Getter",
            desc: "Collect your first gift",
            check: (s) => s.giftsCollected >= 1,
            reward: 15,
          },
          {
            id: "gift_10",
            name: "Gift Hoarder",
            desc: "Collect 10 gifts",
            check: (s) => s.giftsCollected >= 10,
            reward: 80,
          },
          {
            id: "gift_50",
            name: "Santa's Helper",
            desc: "Collect 50 gifts",
            check: (s) => s.giftsCollected >= 50,
            reward: 250,
          },
        ];

        // --- DOM refs ---
        const $ = (id) => document.getElementById(id);
        const app = $("app"),
          toast = $("toast");
        const coinsVal = $("coinsVal"),
          levelVal = $("levelVal"),
          contactsVal = $("contactsVal"),
          xpBar = $("xpBar");
        const avatarEl = $("avatar"),
          nameEl = $("contactName"),
          statusEl = $("contactStatus");
        const cardEl = $("contactCard"),
          contactsList = $("contactsList"),
          contactCount = $("contactCount");
        const btnAdd = $("btnAdd"),
          btnSkip = $("btnSkip"),
          btnMsg = $("btnMsg");
        const statCoins = $("statCoins");
        const streakBanner = $("streakBanner");

        // Views & tabs
        const views = {
          people: $("viewPeople"),
          chats: $("viewChats"),
          feed: $("viewFeed"),
          shop: $("viewShop"),
          games: $("viewGames"),
        };
        const tabs = {
          people: $("tabPeople"),
          chats: $("tabChats"),
          feed: $("tabFeed"),
          shop: $("tabShop"),
          games: $("tabGames"),
        };

        // Chats
        const chatsList = $("chatsList");

        // Feed
        const feedList = $("feedList");

        // Shop
        const shopCoins = $("shopCoins"),
          shopSections = $("shopSections"),
          charPreview = $("charPreview");

        // Games
        const gamesLibrary = $("gamesLibrary"),
          gameSearch = $("gameSearch"),
          gamesCoins = $("gamesCoins"),
          gameModal = $("gameModal"),
          gameModalContent = $("gameModalContent"),
          gameModalClose = $("gameModalClose"),
          playableOverlay = $("playableOverlay"),
          playableFrame = $("playableFrame"),
          playableTitle = $("playableTitle"),
          playableOpponent = $("playableOpponent"),
          playableClose = $("playableClose");

        // DM
        const dmOverlay = $("dmOverlay"),
          dmAvatar = $("dmAvatar"),
          dmName = $("dmName");
        const dmStatus = $("dmStatus"),
          dmClose = $("dmClose"),
          dmMessages = $("dmMessages");
        const dmInput = $("dmInput"),
          dmSend = $("dmSend"),
          dmTyping = $("dmTyping");

        // --- State ---
        let state = {
          coins: 0,
          totalCoins: 0,
          contactsAdded: 0,
          messagesSent: 0,
          level: 1,
          xp: 0,
          streak: 0,
          lastPlayDate: null,
          myContacts: [],
          currentView: "people",
          ownedItems: [
            "skin_default",
            "eyes_default",
            "nose_default",
            "hair_default",
            "hat_default",
            "glasses_default",
            "shirt_default",
          ],
          equipped: {
            skin: "skin_default",
            eyes: "eyes_default",
            nose: "nose_default",
            hair: "hair_default",
            hat: "hat_default",
            glasses: "glasses_default",
            shirt: "shirt_default",
          },
          unlockedAchievements: [],
          itemsBought: 0,
          giftsCollected: 0,
          pendingGifts: {}, // { contactId: { emoji, name, coins, xp } }
          feedReplyUnlocked: false,
          feedLikes: {}, // { postKey: true }
          chatStates: {}, // { contactId: { expectedNodeIds, lastIntent, updatedAt } }
          ownedGames: ["paddle-clash"],
          gamesPlayed: 0,
          gamesWon: 0,
          botInviteCooldowns: {}, // { contactId: timestamp }
        };
        let currentContact = null;
        let dmContact = null;
        let db = null;
        let activeMatch = null;
        const giftTimers = {}; // runtime timers per contact id

        function rand(arr) {
          return arr[Math.floor(Math.random() * arr.length)];
        }

        function randomToken(length = 2) {
          const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
          let out = "";
          for (let i = 0; i < length; i++)
            out += chars[Math.floor(Math.random() * chars.length)];
          return out;
        }

        function generateName() {
          const prefix = rand(prefixes);
          const core = rand(cores);
          const suffix = rand(suffixes);
          const style = Math.floor(Math.random() * 6);

          if (style === 0) return prefix + core + suffix;
          if (style === 1) return core + suffix;
          if (style === 2)
            return prefix + core + Math.floor(Math.random() * 900 + 100);
          if (style === 3)
            return prefix + "_" + core + randomToken(2).toUpperCase();
          if (style === 4) return core + "." + suffix;
          return prefix + core + "_" + Math.floor(Math.random() * 99);
        }

        function generateStatus() {
          if (maybe(0.4)) return rand(statusTexts);
          const action = rand(statusActions);
          const context = rand(statusContexts);
          const ending = maybe(0.35) ? " rn" : "";
          return action + " " + context + ending;
        }

        // --- Semantic chat replies ---
        let semanticEnginePromise = null;

        function generateRandomChatMessage() {
          if (maybe(0.55)) return rand(chatMessages);
          const opener = rand(chatOpeners);
          const intent = rand(chatIntents);
          const tail = maybe(0.35) ? " ?" : maybe(0.25) ? " lol" : "";
          return opener + " " + intent + tail;
        }

        function dotProduct(a, b) {
          let total = 0;
          for (let i = 0; i < a.length; i++) total += a[i] * b[i];
          return total;
        }

        function tensorToRows(tensor) {
          const values = tensor.tolist();
          return Array.isArray(values[0]) ? values : [values];
        }

        async function loadSemanticEngine() {
          if (!semanticEnginePromise) {
            semanticEnginePromise = (async () => {
              const { pipeline } = await import(
                "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1"
              );

              const extractor = await pipeline(
                "feature-extraction",
                "Xenova/all-MiniLM-L6-v2",
              );

              const exampleTexts = [];
              const exampleIntentIndexes = [];

              SEMANTIC_CHAT_INTENTS.forEach((intent, intentIndex) => {
                intent.examples.forEach((example) => {
                  exampleTexts.push(example);
                  exampleIntentIndexes.push(intentIndex);
                });
              });

              const output = await extractor(exampleTexts, {
                pooling: "mean",
                normalize: true,
              });

              return {
                extractor,
                exampleVectors: tensorToRows(output),
                exampleIntentIndexes,
              };
            })().catch((error) => {
              // Allow another load attempt after a network/model failure.
              semanticEnginePromise = null;
              throw error;
            });
          }

          return semanticEnginePromise;
        }

        function getChatState(contactId) {
          return (state.chatStates && state.chatStates[contactId]) || {
            expectedNodeIds: [],
            lastIntent: null,
          };
        }

        function findBestSemanticMatch(inputVector, engine, allowedIntentIds) {
          const allowed = allowedIntentIds
            ? new Set(allowedIntentIds)
            : null;
          let bestScore = -Infinity;
          let bestIntentIndex = -1;

          for (let i = 0; i < engine.exampleVectors.length; i++) {
            const intent = SEMANTIC_CHAT_INTENTS[engine.exampleIntentIndexes[i]];
            if (allowed && !allowed.has(intent.id)) continue;

            const score = dotProduct(inputVector, engine.exampleVectors[i]);
            if (score > bestScore) {
              bestScore = score;
              bestIntentIndex = engine.exampleIntentIndexes[i];
            }
          }

          return { bestScore, bestIntentIndex };
        }

        function findDirectChatIntent(input) {
          const normalizedInput = input.toLowerCase();
          return SEMANTIC_CHAT_INTENTS.find((intent) =>
            intent.keywords?.some((keyword) => normalizedInput.includes(keyword)),
          );
        }

        // Tone repair is intentionally rule-based and runs before embeddings.
        // A random game reply after an insult or a frustrated complaint makes the
        // contact feel oblivious, even if the semantic model is unavailable.
        function findToneRepairIntent(input) {
          const text = input.toLowerCase().replace(/[^a-z0-9\s']/g, " ");
          const isUserApologizing = /\b(?:i'?m sorry|im sorry|my bad|i apologize|sorry about that)\b/.test(text);
          if (isUserApologizing) return chatOptions.getNode("user_apology");

          const directHostility = [
            /\bi\s+(?:really\s+)?(?:fucking\s+)?hate\s+(?:you|this|everything)\b/,
            /\byou(?:'re| are| r)\s+(?:so\s+|the\s+)?(?:awful|terrible|useless|annoying|mean|stupid|dumb|pathetic|worthless)\b/,
            /\b(?:fuck|fucking|bitch|asshole|loser|idiot|moron|trash|garbage|fag(?:got)?|retard(?:ed)?)\b/,
            /\b(?:this|that|the game|your reply)\s+(?:is|was)\s+(?:so\s+)?(?:bad|awful|terrible|trash|garbage|stupid)\b/,
            /\b(?:go away|shut up|leave me alone)\b/,
          ];
          return directHostility.some((pattern) => pattern.test(text))
            ? chatOptions.getNode("repair")
            : null;
        }

        async function generateChatMessage(userInput, contactId) {
          const cleanInput = String(userInput || "").trim();
          if (!cleanInput) {
            return {
              text: generateRandomChatMessage(),
              intentId: null,
              nextNodeIds: [],
            };
          }

          const repairIntent = findToneRepairIntent(cleanInput);
          if (repairIntent) {
            const response = chatOptions.getResponse(repairIntent);
            state.chatStates[contactId] = {
              expectedNodeIds: response.next || [],
              lastIntent: repairIntent.id,
              updatedAt: Date.now(),
            };
            save();
            return {
              text: response.text,
              intentId: repairIntent.id,
              nextNodeIds: response.next,
            };
          }

          const directIntent = findDirectChatIntent(cleanInput);
          if (directIntent) {
            const response = chatOptions.getResponse(directIntent);
            state.chatStates[contactId] = {
              expectedNodeIds: response.next || [],
              lastIntent: directIntent.id,
              updatedAt: Date.now(),
            };
            save();
            return {
              text: response.text,
              intentId: directIntent.id,
              nextNodeIds: response.next,
            };
          }

          try {
            const engine = await loadSemanticEngine();
            const output = await engine.extractor(cleanInput, {
              pooling: "mean",
              normalize: true,
            });
            const inputVector = tensorToRows(output)[0];
            const chatState = getChatState(contactId);
            let match = findBestSemanticMatch(
              inputVector,
              engine,
              chatState.expectedNodeIds.length
                ? chatState.expectedNodeIds
                : null,
            );

            // If the message changes topics, use the full intent list instead
            // of forcing it into the previous conversational branch.
            if (match.bestIntentIndex < 0 || match.bestScore < 0.32) {
              match = findBestSemanticMatch(inputVector, engine, null);
            }

            // Low confidence: keep the old random behavior rather than force
            // an unrelated response.
            if (match.bestIntentIndex < 0 || match.bestScore < 0.32) {
              return {
                text: generateRandomChatMessage(),
                intentId: null,
                nextNodeIds: [],
              };
            }

            const matchedIntent = SEMANTIC_CHAT_INTENTS[match.bestIntentIndex];
            const response = chatOptions.getResponse(matchedIntent);
            state.chatStates[contactId] = {
              expectedNodeIds: response.next || [],
              lastIntent: matchedIntent.id,
              updatedAt: Date.now(),
            };
            save();
            console.debug("Semantic reply match", {
              input: cleanInput,
              intent: matchedIntent.id,
              score: Number(match.bestScore.toFixed(3)),
              expectedNext: response.next,
            });

            return {
              text: response.text,
              intentId: matchedIntent.id,
              nextNodeIds: response.next,
            };
          } catch (error) {
            console.warn("Semantic matching unavailable; using random reply", error);
            return {
              text: generateRandomChatMessage(),
              intentId: null,
              nextNodeIds: [],
            };
          }
        }

        function generateFeedPostText() {
          if (maybe(0.5)) return rand(feedPosts);
          return (
            rand(feedLeads) +
            " " +
            rand(feedActions) +
            " - " +
            rand(feedClosers)
          );
        }

        function generateFeedReplyText(postText) {
          return chatOptions.getFeedReply(postText);
        }

        function save() {
          try {
            localStorage.setItem("contactGameV2", JSON.stringify(state));
          } catch {}
        }
        function load() {
          try {
            const s = JSON.parse(localStorage.getItem("contactGameV2"));
            if (s) state = { ...state, ...s };
          } catch {}
          state.ownedGames = Array.isArray(state.ownedGames)
            ? state.ownedGames
            : ["paddle-clash"];
          state.chatStates = state.chatStates || {};
          state.gamesPlayed = Number(state.gamesPlayed) || 0;
          state.gamesWon = Number(state.gamesWon) || 0;
          state.botInviteCooldowns = state.botInviteCooldowns || {};
          state.myContacts.forEach((contact) => ensureContactPersonality(contact));
          // Persist the migration for contacts created before personalities existed.
          save();
        }

        // --- IndexedDB ---
        function openDB() {
          return new Promise((resolve, reject) => {
            const req = indexedDB.open("ContactGameDMs", 1);
            req.onupgradeneeded = (e) => {
              const d = e.target.result;
              if (!d.objectStoreNames.contains("messages")) {
                const store = d.createObjectStore("messages", {
                  keyPath: "id",
                  autoIncrement: true,
                });
                store.createIndex("contactId", "contactId", { unique: false });
              }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error);
          });
        }

        function dbSaveMsg(msg) {
          return new Promise((resolve, reject) => {
            const tx = db.transaction("messages", "readwrite");
            tx.objectStore("messages").add(msg);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
          });
        }

        function dbUpdateMsg(msg) {
          return new Promise((resolve, reject) => {
            const tx = db.transaction("messages", "readwrite");
            tx.objectStore("messages").put(msg);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
          });
        }

        function dbGetMessages(contactId) {
          return new Promise((resolve, reject) => {
            const tx = db.transaction("messages", "readonly");
            const idx = tx.objectStore("messages").index("contactId");
            const req = idx.getAll(contactId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
          });
        }

        function dbGetLastMessage(contactId) {
          return new Promise((resolve, reject) => {
            const tx = db.transaction("messages", "readonly");
            const idx = tx.objectStore("messages").index("contactId");
            const req = idx.openCursor(contactId, "prev");
            req.onsuccess = () => resolve(req.result ? req.result.value : null);
            req.onerror = (e) => reject(e.target.error);
          });
        }

        // --- Streak ---
        function checkStreak() {
          const today = new Date().toDateString();
          if (state.lastPlayDate === today) return;
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          if (state.lastPlayDate === yesterday) {
            state.streak += 1;
            const bonus = Math.min(state.streak * 5, 50);
            state.coins += bonus;
            state.totalCoins += bonus;
            streakBanner.textContent = `🔥 ${state.streak} day streak! +${bonus} bonus coins`;
            streakBanner.classList.add("show");
            setTimeout(() => streakBanner.classList.remove("show"), 4000);
          } else if (state.lastPlayDate !== null) {
            state.streak = 1;
          } else {
            state.streak = 1;
          }
          state.lastPlayDate = today;
          save();
        }

        // --- XP & Level ---
        function addXP(amount) {
          state.xp += amount;
          while (state.xp >= XP_PER_LEVEL) {
            state.xp -= XP_PER_LEVEL;
            state.level += 1;
            showToast(`⭐ LEVEL UP! Lv ${state.level}`, "levelup");
            if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
          }
        }

        // --- Achievements ---
        function checkAchievements() {
          for (const a of ACHIEVEMENTS) {
            if (state.unlockedAchievements.includes(a.id)) continue;
            if (a.check(state)) {
              state.unlockedAchievements.push(a.id);
              state.coins += a.reward;
              state.totalCoins += a.reward;
              setTimeout(
                () => showToast(`🏆 ${a.name}! +${a.reward}🪙`, "achievement"),
                500,
              );
            }
          }
        }

        // --- Gift System ---
        function scheduleGift(contact) {
          if (giftTimers[contact.id]) return; // already scheduled
          const delay =
            GIFT_MIN_MS +
            Math.floor(Math.random() * (GIFT_MAX_MS - GIFT_MIN_MS));
          giftTimers[contact.id] = setTimeout(() => {
            delete giftTimers[contact.id];
            deliverGift(contact);
          }, delay);
        }

        function deliverGift(contact) {
          if (!state.myContacts.some((c) => c.id === contact.id)) return;
          if (state.pendingGifts[contact.id]) return; // already has uncollected gift
          const gift = rand(GIFT_TYPES);
          state.pendingGifts[contact.id] = { ...gift };
          save();
          showToast(`🎁 ${contact.name} sent you a gift!`, "gift");
          if (navigator.vibrate) navigator.vibrate([10, 15, 10]);
          updateUI();
          if (state.currentView === "chats") renderChatsList();
        }

        function collectGift(contact) {
          const gift = state.pendingGifts[contact.id];
          if (!gift) return null;
          state.coins += gift.coins;
          state.totalCoins += gift.coins;
          state.giftsCollected += 1;
          addXP(gift.xp);
          delete state.pendingGifts[contact.id];
          checkAchievements();
          save();
          updateUI();
          // Schedule next gift for this contact
          scheduleGift(contact);
          return gift;
        }

        function startAllGiftTimers() {
          for (const c of state.myContacts) {
            if (!state.pendingGifts[c.id]) {
              scheduleGift(c);
            }
          }
        }

        // --- Contacts ---
        function makePersonality() {
          const base = rand(BOT_PERSONALITIES);
          return { ...base, seed: Math.floor(Math.random() * 1000000) };
        }

        // This is deliberately never rendered in the contact UI. It gives every
        // bot a consistent way to play and decide on challenges across sessions.
        function ensureContactPersonality(contact) {
          if (!contact.personality) contact.personality = makePersonality();
          return contact.personality;
        }

        function generateContact() {
          let name,
            tries = 0;
          do {
            name = generateName();
            tries++;
          } while (state.myContacts.some((c) => c.name === name) && tries < 30);
          const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}&backgroundColor=5865f2,7c3aed,99aab5&radius=50`;
          return {
            id: Date.now() + Math.random(),
            name,
            avatar,
            status: generateStatus(),
            personality: makePersonality(),
          };
        }

        function renderContactCard(c) {
          cardEl.style.animation = "none";
          void cardEl.offsetWidth;
          cardEl.style.animation = "pop .4s cubic-bezier(.175,.885,.32,1.275)";
          avatarEl.src = c.avatar;
          nameEl.textContent = c.name;
          statusEl.textContent = c.status;
        }

        function nextContact() {
          currentContact = generateContact();
          renderContactCard(currentContact);
        }

        // --- Fake history ---
        function generateFakeHistory(contact) {
          const conversation = chatOptions.getFakeConversation();
          const now = Date.now();
          const span = (1 + Math.floor(Math.random() * 4)) * 86400000;
          return conversation.map((message, index) => ({
              contactId: contact.id,
              text: message.text,
              sender: message.sender,
              timestamp:
                now -
                span +
                Math.floor((span / conversation.length) * index) +
                Math.floor(Math.random() * 60000),
            }));
        }

        // --- UI Updates ---
        function updateUI() {
          coinsVal.textContent = state.coins;
          contactsVal.textContent = state.contactsAdded;
          levelVal.textContent = state.level;
          contactCount.textContent = state.myContacts.length;
          xpBar.style.width = (state.xp / XP_PER_LEVEL) * 100 + "%";
          shopCoins.textContent = state.coins;
          gamesCoins.textContent = state.coins;

          if (state.myContacts.length === 0) {
            contactsList.innerHTML =
              '<div class="empty-contacts">No friends yet</div>';
          } else {
            contactsList.innerHTML = state.myContacts
              .map((c) => {
                const hasGift = !!state.pendingGifts[c.id];
                return `
          <div class="contact-mini" data-cid="${c.id}" title="${hasGift ? "Collect gift from" : "DM"} ${c.name}">
            ${hasGift ? '<span class="gift-badge">🎁</span>' : ""}
            <img class="mini-avatar" src="${c.avatar}" alt="">
            <div class="mini-name">${escapeHTML(c.name)}</div>
          </div>
        `;
              })
              .join("");
            contactsList.querySelectorAll(".contact-mini").forEach((el) => {
              el.addEventListener("click", () => {
                const id = parseFloat(el.dataset.cid);
                const c = state.myContacts.find((x) => x.id === id);
                if (!c) return;
                const gift = collectGift(c);
                if (gift) {
                  flyCoin(gift.coins);
                  showToast(
                    `${gift.emoji} ${c.name} sent ${gift.name}! +${gift.coins}🪙 +${gift.xp}XP`,
                    "gift",
                  );
                } else {
                  openDM(c);
                }
              });
            });
          }
        }

        function showToast(msg, type = "") {
          toast.textContent = msg;
          toast.className = "toast show" + (type ? " " + type : "");
          setTimeout(() => toast.classList.remove("show"), 2500);
        }

        function flyCoin(amount, el) {
          const fly = document.createElement("div");
          fly.className = "coin-fly";
          fly.textContent = "+" + amount;
          const rect = (el || btnAdd).getBoundingClientRect();
          const appRect = app.getBoundingClientRect();
          fly.style.left =
            rect.left - appRect.left + rect.width / 2 - 10 + "px";
          fly.style.top = rect.top - appRect.top + "px";
          app.appendChild(fly);
          setTimeout(() => fly.remove(), 800);
        }

        // --- Actions ---
        function addContact() {
          if (
            !currentContact ||
            state.myContacts.some((c) => c.id === currentContact.id)
          )
            return;
          if (navigator.vibrate) navigator.vibrate(10);

          state.myContacts.unshift(currentContact);
          state.coins += 10;
          state.totalCoins += 10;
          state.contactsAdded += 1;
          addXP(10);

          flyCoin(10);
          statCoins.classList.add("bump");
          setTimeout(() => statCoins.classList.remove("bump"), 150);

          showToast(`Added ${currentContact.name}!`);
          checkAchievements();
          updateUI();
          save();
          scheduleGift(currentContact);
          setTimeout(nextContact, 200);
        }

        function skipContact() {
          if (navigator.vibrate) navigator.vibrate(5);
          addXP(1);
          save();
          updateUI();
          nextContact();
        }

        function messageContact() {
          if (!currentContact) return;
          const existing = state.myContacts.find(
            (c) => c.name === currentContact.name,
          );
          if (existing) {
            openDM(existing);
          } else {
            state.myContacts.unshift(currentContact);
            state.coins += 10;
            state.totalCoins += 10;
            state.contactsAdded += 1;
            addXP(10);
            flyCoin(10);
            checkAchievements();
            updateUI();
            save();
            scheduleGift(currentContact);
            openDM(currentContact);
            setTimeout(nextContact, 200);
          }
        }

        // --- Tabs ---
        function switchView(view) {
          state.currentView = view;
          Object.keys(views).forEach((k) => {
            views[k].classList.toggle("active", k === view);
            tabs[k].classList.toggle("active", k === view);
          });
          if (view === "chats") renderChatsList();
          if (view === "feed") renderFeed();
          if (view === "shop") renderShop();
          if (view === "games") renderGames();
          save();
        }

        Object.keys(tabs).forEach((k) => {
          tabs[k].addEventListener("click", () => switchView(k));
        });

        // --- Chats View ---
        async function renderChatsList() {
          if (state.myContacts.length === 0) {
            chatsList.innerHTML =
              '<div class="chats-empty">No conversations yet. Add friends and message them!</div>';
            return;
          }

          const entries = [];
          for (const c of state.myContacts) {
            const last = await dbGetLastMessage(c.id);
            if (last) {
              entries.push({ contact: c, lastMsg: last });
            }
          }

          entries.sort((a, b) => b.lastMsg.timestamp - a.lastMsg.timestamp);

          if (entries.length === 0) {
            chatsList.innerHTML =
              '<div class="chats-empty">No messages yet. Tap "Message" on a contact to start chatting!</div>';
            return;
          }

          chatsList.innerHTML = entries
            .map((e) => {
              const preview =
                (e.lastMsg.sender === "me" ? "You: " : "") + e.lastMsg.text;
              const time = formatTimeShort(e.lastMsg.timestamp);
              const hasGift = !!state.pendingGifts[e.contact.id];
              return `
        <div class="chat-item" data-cid="${e.contact.id}">
          <img class="chat-avatar" src="${e.contact.avatar}" alt="">
          <div class="chat-info">
            <div class="chat-name">${escapeHTML(e.contact.name)}</div>
            <div class="chat-preview">${escapeHTML(preview)}</div>
          </div>
          ${hasGift ? '<span class="chat-gift">🎁</span>' : ""}
          <div class="chat-time">${time}</div>
        </div>
      `;
            })
            .join("");

          chatsList.querySelectorAll(".chat-item").forEach((el) => {
            el.addEventListener("click", () => {
              const id = parseFloat(el.dataset.cid);
              const c = state.myContacts.find((x) => x.id === id);
              if (!c) return;
              const gift = collectGift(c);
              if (gift) {
                flyCoin(gift.coins);
                showToast(
                  `${gift.emoji} ${c.name} sent ${gift.name}! +${gift.coins}🪙 +${gift.xp}XP`,
                  "gift",
                );
                renderChatsList();
              }
              openDM(c);
            });
          });
        }

        function formatTimeShort(ts) {
          const d = new Date(ts);
          const now = new Date();
          if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          }
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
          return d.toLocaleDateString([], { month: "short", day: "numeric" });
        }

        // --- DM ---
        function formatTime(ts) {
          return new Date(ts).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        function formatDate(ts) {
          const d = new Date(ts),
            now = new Date();
          if (d.toDateString() === now.toDateString()) return "Today";
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          if (d.toDateString() === y.toDateString()) return "Yesterday";
          return d.toLocaleDateString([], { month: "short", day: "numeric" });
        }

        function escapeHTML(str) {
          const d = document.createElement("div");
          d.textContent = str;
          return d.innerHTML;
        }

        function renderDMMessages(msgs) {
          dmMessages.innerHTML = "";
          let lastDate = "";
          msgs.forEach((m) => {
            const date = formatDate(m.timestamp);
            if (date !== lastDate) {
              lastDate = date;
              const sep = document.createElement("div");
              sep.className = "dm-date-sep";
              sep.textContent = date;
              dmMessages.appendChild(sep);
            }
            const div = document.createElement("div");
            div.className = "dm-msg " + m.sender;
            const invite = m.kind === "game-invite";
            const game = invite ? getGame(m.gameId) : null;
            const inviteCard = invite && game
              ? `<div class="dm-game-invite ${m.inviteStatus || "pending"}" data-message-id="${m.id}">
                  <div class="dm-game-invite-top"><span>🎮</span><div><strong>${escapeHTML(game.title)}</strong><small>Win +${game.reward} 🪙 · Lose -${game.loss} 🪙</small></div></div>
                  ${m.inviteStatus === "accepted"
                    ? '<div class="dm-game-invite-state">✓ Challenge accepted</div>'
                    : m.inviteStatus === "declined"
                      ? '<div class="dm-game-invite-state">Challenge declined</div>'
                      : `<div class="dm-game-invite-actions"><button data-invite-action="decline">Decline</button><button data-invite-action="accept">Play ${escapeHTML(game.title)}</button></div>`}
                </div>`
              : "";
            div.innerHTML =
              escapeHTML(m.text) +
              inviteCard +
              '<span class="dm-time">' +
              formatTime(m.timestamp) +
              "</span>";
            dmMessages.appendChild(div);
          });
          dmMessages.querySelectorAll(".dm-game-invite").forEach((card) => {
            const message = msgs.find((item) => String(item.id) === card.dataset.messageId);
            if (!message) return;
            card.querySelectorAll("[data-invite-action]").forEach((button) => {
              button.addEventListener("click", () => {
                if (button.dataset.inviteAction === "accept") acceptBotGameInvite(message);
                else declineBotGameInvite(message);
              });
            });
          });
          dmMessages.scrollTop = dmMessages.scrollHeight;
        }

        async function acceptBotGameInvite(invite) {
          const game = getGame(invite.gameId);
          const contact = state.myContacts.find((item) => item.id === invite.contactId) || dmContact;
          if (!game || !contact || !state.ownedGames.includes(game.id)) return;
          invite.inviteStatus = "accepted";
          await dbUpdateMsg(invite);
          await dbSaveMsg({ contactId: contact.id, text: `I'm in. Let's play ${game.title}.`, sender: "me", timestamp: Date.now() });
          renderDMMessages(await dbGetMessages(contact.id));
          launchGame(game, contact);
        }

        async function declineBotGameInvite(invite) {
          const contact = state.myContacts.find((item) => item.id === invite.contactId) || dmContact;
          if (!contact) return;
          invite.inviteStatus = "declined";
          await dbUpdateMsg(invite);
          await dbSaveMsg({ contactId: contact.id, text: "Not right now.", sender: "me", timestamp: Date.now() });
          await dbSaveMsg({ contactId: contact.id, text: "All good. Hit me up when you feel like running one.", sender: "them", timestamp: Date.now() });
          renderDMMessages(await dbGetMessages(contact.id));
        }

        async function openDM(contact) {
          dmContact = contact;
          dmAvatar.src = contact.avatar;
          dmName.textContent = contact.name;
          dmStatus.textContent = contact.status || "Online";
          dmTyping.textContent = "";
          dmInput.value = "";

          let msgs = await dbGetMessages(contact.id);
          if (msgs.length === 0) {
            const fakes = generateFakeHistory(contact);
            for (const m of fakes) await dbSaveMsg(m);
            msgs = await dbGetMessages(contact.id);
          }

          renderDMMessages(msgs);
          dmOverlay.classList.add("open");
          setTimeout(() => dmInput.focus(), 300);
        }

        function closeDM() {
          dmOverlay.classList.remove("open");
          dmContact = null;
          if (state.currentView === "chats") renderChatsList();
        }

        async function sendDM() {
          const text = dmInput.value.trim();
          if (!text || !dmContact) return;
          dmInput.value = "";

          const msg = {
            contactId: dmContact.id,
            text,
            sender: "me",
            timestamp: Date.now(),
          };
          await dbSaveMsg(msg);

          state.messagesSent += 1;
          state.coins += 2;
          state.totalCoins += 2;
          addXP(3);
          checkAchievements();
          updateUI();
          save();

          const msgs = await dbGetMessages(dmContact.id);
          renderDMMessages(msgs);

          // Simulated semantic reply based on the message the user sent.
          const replyingContact = dmContact;
          dmTyping.textContent = replyingContact.name + " is typing...";
          const delay = 600 + Math.floor(Math.random() * 2000);

          setTimeout(async () => {
            const replyResult = await generateChatMessage(text, replyingContact.id);
            const reply = {
              contactId: replyingContact.id,
              text: replyResult.text,
              sender: "them",
              timestamp: Date.now(),
            };
            await dbSaveMsg(reply);

            // Only update the open panel if this same conversation is still open.
            if (dmContact && dmContact.id === replyingContact.id) {
              dmTyping.textContent = "";
              const updated = await dbGetMessages(replyingContact.id);
              renderDMMessages(updated);
              if (navigator.vibrate) navigator.vibrate(5);
            }

            // Once the bot has answered play-related conversation, it can turn
            // that context into a real, actionable invite instead of only text.
            setTimeout(() => {
              maybeSendBotGameInvite(replyingContact, text, replyResult.intentId);
            }, 450 + Math.floor(Math.random() * 850));
          }, delay);
        }

        dmClose.addEventListener("click", closeDM);
        dmOverlay.addEventListener("click", (e) => {
          if (e.target === dmOverlay) closeDM();
        });
        dmSend.addEventListener("click", sendDM);
        dmInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            sendDM();
          }
        });

        // --- Arcade ---
        function getGame(id) {
          return GAME_CATALOG.find((game) => game.id === id);
        }

        function selectContextGame(input) {
          const text = String(input || "").toLowerCase();
          const owned = GAME_CATALOG.filter((game) => state.ownedGames.includes(game.id));
          if (!owned.length) return null;
          if (/pong|paddle|swing/.test(text)) return owned.find((game) => game.id === "paddle-clash") || owned[0];
          if (/race|racing|sprint|platform/.test(text)) return owned.find((game) => game.id === "skyline-sprint") || owned[0];
          if (/shoot|gun|bullet|showdown|weapon/.test(text)) return owned.find((game) => game.id === "neon-showdown") || owned[0];
          return rand(owned);
        }

        async function maybeSendBotGameInvite(contact, input, intentId) {
          const text = String(input || "").toLowerCase();
          const explicitPlayTalk = /\b(?:play|queue|duos|ranked|casual|match|game|1v1|challenge|invite|lobby)\b/.test(text);
          const inviteIntents = new Set(["invite_to_play", "choose_mode", "confirmation", "other_game"]);
          if (!explicitPlayTalk && !inviteIntents.has(intentId)) return;

          const lastInvite = state.botInviteCooldowns[contact.id] || 0;
          if (Date.now() - lastInvite < 6 * 60 * 1000) return;
          const messages = await dbGetMessages(contact.id);
          if (messages.some((message) => message.kind === "game-invite" && message.inviteStatus === "pending")) return;

          const personality = ensureContactPersonality(contact);
          const inviteOdds = { competitive: .9, fun: .68, random: .52, rookie: .42 };
          const chance = inviteOdds[personality.id] || .55;
          if (Math.random() > chance) return;

          const game = selectContextGame(text);
          if (!game) return;
          const intros = {
            competitive: [`I want a real rematch. ${game.title}?`, `Enough talking—let's settle it in ${game.title}.`],
            fun: [`This chat has me wanting to play ${game.title}.`, `Want to make this a ${game.title} session?`],
            random: [`I have a weird urge to run ${game.title} right now.`, `${game.title} just popped into my head. Want in?`],
            rookie: [`I could use some practice in ${game.title}. Want to play?`, `I am down for a friendly ${game.title} match if you are.`],
          };
          await dbSaveMsg({
            contactId: contact.id,
            text: rand(intros[personality.id] || intros.fun),
            sender: "them",
            timestamp: Date.now(),
            kind: "game-invite",
            gameId: game.id,
            inviteStatus: "pending",
          });
          state.botInviteCooldowns[contact.id] = Date.now();
          save();
          if (dmContact && dmContact.id === contact.id) {
            renderDMMessages(await dbGetMessages(contact.id));
            if (navigator.vibrate) navigator.vibrate([10, 25, 10]);
          } else {
            showToast(`🎮 ${contact.name} invited you to ${game.title}!`, "gift");
            if (state.currentView === "chats") renderChatsList();
          }
        }

        function renderGames() {
          const query = gameSearch.value.trim().toLowerCase();
          const games = GAME_CATALOG.filter((game) =>
            [game.title, game.tagline, game.description]
              .join(" ")
              .toLowerCase()
              .includes(query),
          );
          gamesCoins.textContent = state.coins;

          if (!games.length) {
            gamesLibrary.innerHTML = '<div class="games-empty">No games match that search.</div>';
            return;
          }

          gamesLibrary.innerHTML = games
            .map((game) => {
              const owned = state.ownedGames.includes(game.id);
              return `<article class="game-card ${owned ? "game-owned" : "game-locked"}">
                <div class="game-cover game-cover-${game.art}" role="img" aria-label="${game.title} gameplay preview">
                  <span class="game-cover-label">${game.tagline}</span>
                  <span class="game-cover-play">▶</span>
                </div>
                <div class="game-card-body">
                  <div class="game-card-topline"><h3>${game.title}</h3><span>${owned ? "OWNED" : "LOCKED"}</span></div>
                  <p>${game.description}</p>
                  <div class="game-card-footer">
                    <span class="game-stakes">Win +${game.reward} 🪙 · Lose -${game.loss} 🪙</span>
                    <button class="game-action" data-game-id="${game.id}" data-action="${owned ? "play" : "buy"}">${owned ? "Play" : `Buy · ${game.price} 🪙`}</button>
                  </div>
                </div>
              </article>`;
            })
            .join("");

          gamesLibrary.querySelectorAll(".game-action").forEach((button) => {
            button.addEventListener("click", () => {
              const game = getGame(button.dataset.gameId);
              if (!game) return;
              if (button.dataset.action === "buy") buyGame(game);
              else openChallengeSetup(game);
            });
          });
        }

        function buyGame(game) {
          if (state.coins < game.price) {
            showToast(`Need ${game.price - state.coins} more coins to unlock ${game.title}.`);
            return;
          }
          state.coins -= game.price;
          state.ownedGames.push(game.id);
          state.itemsBought += 1;
          addXP(10);
          checkAchievements();
          save();
          updateUI();
          renderGames();
          showToast(`${game.title} unlocked! 🎮`);
        }

        function makeQuickOpponent() {
          const contact = generateContact();
          contact.id = `quick_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          return contact;
        }

        function openGameModal(content) {
          gameModalContent.innerHTML = content;
          gameModal.classList.add("open");
          gameModal.setAttribute("aria-hidden", "false");
        }

        function closeGameModal() {
          gameModal.classList.remove("open");
          gameModal.setAttribute("aria-hidden", "true");
          gameModalContent.innerHTML = "";
        }

        function openChallengeSetup(game) {
          const quickOpponent = makeQuickOpponent();
          const opponents = [...state.myContacts, quickOpponent];
          const options = opponents
            .map(
              (contact, index) => `<button class="opponent-option ${index === 0 ? "selected" : ""}" data-index="${index}">
                <img src="${contact.avatar}" alt=""><span>${escapeHTML(contact.name)}</span><small>${contact === quickOpponent ? "Quick match" : "Send via DM"}</small>
              </button>`,
            )
            .join("");
          openGameModal(`<div class="challenge-head">
              <div class="challenge-icon game-cover-${game.art}">▶</div>
              <div><p>CHALLENGE</p><h2>${game.title}</h2><span>${game.controls}</span></div>
            </div>
            <p class="challenge-copy">Pick an opponent. Their personality affects how tough they are and whether they take the match.</p>
            <div class="opponent-list">${options}</div>
            <button class="challenge-send" id="challengeSend">Send challenge</button>`);

          let selectedOpponent = opponents[0];
          gameModalContent.querySelectorAll(".opponent-option").forEach((button) => {
            button.addEventListener("click", () => {
              gameModalContent.querySelectorAll(".opponent-option").forEach((item) => item.classList.remove("selected"));
              button.classList.add("selected");
              selectedOpponent = opponents[Number(button.dataset.index)];
            });
          });
          $("challengeSend").addEventListener("click", () => sendGameChallenge(game, selectedOpponent));
        }

        async function addGameDM(contact, text, sender) {
          await dbSaveMsg({ contactId: contact.id, text, sender, timestamp: Date.now() });
          if (dmContact && dmContact.id === contact.id) {
            renderDMMessages(await dbGetMessages(contact.id));
          }
        }

        function challengeResponse(game, personality) {
          const lines = {
            competitive: ["I was hoping you would ask. Queue it up.", "Accepted. I am not giving you an easy win though."],
            fun: ["Yeah, that sounds fun. Let’s run it!", "I’m in — no pressure, just a good match."],
            random: ["Why not? I’m feeling unpredictable today.", "Okay, I’ll take the challenge. This could get weird."],
            rookie: ["I might get cooked, but I’m down to try.", "Sure! Go easy on me for like five seconds."],
          };
          return rand(lines[personality.id] || lines.fun);
        }

        async function sendGameChallenge(game, contact) {
          const sendButton = $("challengeSend");
          sendButton.disabled = true;
          sendButton.textContent = "Sending to DM…";
          await addGameDM(contact, `🎮 Challenge: ${game.title}. Want to play for ${game.reward} coins?`, "me");
          const personality = ensureContactPersonality(contact);
          const accepted = Math.random() < personality.acceptChance;
          setTimeout(async () => {
            if (!accepted) {
              await addGameDM(contact, "Not right now — I’m not feeling this match. Maybe later?", "them");
              gameModalContent.innerHTML = `<div class="challenge-result"><span>✕</span><h2>${escapeHTML(contact.name)} declined</h2><p>The challenge is still in your DMs. Try a different opponent or come back later.</p><button class="challenge-send" id="challengeRetry">Choose another opponent</button></div>`;
              $("challengeRetry").addEventListener("click", () => openChallengeSetup(game));
              return;
            }
            await addGameDM(contact, `🎮 ${challengeResponse(game, personality)} Launching ${game.title} now.`, "them");
            closeGameModal();
            launchGame(game, contact);
          }, 750 + Math.floor(Math.random() * 650));
        }

        function launchGame(game, opponent) {
          const personality = ensureContactPersonality(opponent);
          activeMatch = { game, opponent, personality, settled: false };
          playableTitle.textContent = game.title;
          playableOpponent.textContent = ` vs ${opponent.name}`;
          playableFrame.src = game.file;
          playableOverlay.classList.add("open");
          playableOverlay.setAttribute("aria-hidden", "false");
        }

        function sendMatchConfig() {
          if (!activeMatch || !playableFrame.contentWindow) return;
          playableFrame.contentWindow.postMessage({
            type: "people-book:match-config",
            gameId: activeMatch.game.id,
            opponent: { name: activeMatch.opponent.name, difficulty: activeMatch.personality.difficulty },
          }, "*");
        }

        async function settleMatch(playerWon) {
          if (!activeMatch || activeMatch.settled) return;
          activeMatch.settled = true;
          const { game, opponent } = activeMatch;
          const amount = playerWon ? game.reward : Math.min(game.loss, state.coins);
          state.gamesPlayed += 1;
          if (playerWon) {
            state.gamesWon += 1;
            state.coins += amount;
            state.totalCoins += amount;
            addXP(12);
            await addGameDM(opponent, `gg! You got me that time. +${amount} coins is yours.`, "them");
            showToast(`Victory! +${amount} 🪙`, "achievement");
          } else {
            state.coins -= amount;
            addXP(4);
            await addGameDM(opponent, `gg — that was close. ${amount ? `-${amount} coins this round.` : "No coins left to lose."}`, "them");
            showToast(amount ? `Match lost. -${amount} 🪙` : "Match lost — your coins are safe at zero.");
          }
          checkAchievements();
          save();
          updateUI();
          renderGames();
        }

        function closePlayable() {
          if (playableFrame.contentWindow) playableFrame.contentWindow.postMessage({ type: "people-book:stop" }, "*");
          playableOverlay.classList.remove("open");
          playableOverlay.setAttribute("aria-hidden", "true");
          playableFrame.src = "about:blank";
          activeMatch = null;
        }

        window.addEventListener("message", async (event) => {
          const message = event.data;
          if (!message || typeof message.type !== "string") return;
          if (message.type === "people-book:game-ready") sendMatchConfig();
          if (message.type === "people-book:game-result") {
            await settleMatch(message.playerWon === true);
          }
          if (message.type === "people-book:leave-game") closePlayable();
        });

        gameModalClose.addEventListener("click", closeGameModal);
        gameModal.addEventListener("click", (event) => {
          if (event.target === gameModal) closeGameModal();
        });
        playableClose.addEventListener("click", closePlayable);
        gameSearch.addEventListener("input", renderGames);

        // --- Shop ---
        function renderCharPreview() {
          const eq = state.equipped;
          let html = "";
          const getEmoji = (cat, id) => {
            const item = COSMETICS[cat].items.find((i) => i.id === id);
            return item ? item.emoji : "";
          };
          const skinE = getEmoji("skin", eq.skin);
          const eyesE = getEmoji("eyes", eq.eyes);
          const noseE = getEmoji("nose", eq.nose);
          const hairE = getEmoji("hair", eq.hair);
          const hatE = getEmoji("hat", eq.hat);
          const glassesE = getEmoji("glasses", eq.glasses);
          const shirtE = getEmoji("shirt", eq.shirt);

          if (skinE && skinE !== "·")
            html += `<span class="char-layer skin">${skinE}</span>`;
          if (eyesE && eyesE !== "·")
            html += `<span class="char-layer eyes">${eyesE}</span>`;
          if (noseE && noseE !== "·")
            html += `<span class="char-layer nose">${noseE}</span>`;
          if (hairE && hairE !== "·")
            html += `<span class="char-layer hair">${hairE}</span>`;
          if (hatE && hatE !== "·")
            html += `<span class="char-layer hat">${hatE}</span>`;
          if (glassesE && glassesE !== "·")
            html += `<span class="char-layer glasses">${glassesE}</span>`;
          if (shirtE && shirtE !== "·")
            html += `<span class="char-layer shirt">${shirtE}</span>`;

          if (!html) html = '<span class="char-layer skin">😶</span>';
          charPreview.innerHTML = html;
        }

        function renderShop() {
          shopCoins.textContent = state.coins;
          renderCharPreview();

          let html = "";
          for (const [cat, data] of Object.entries(COSMETICS)) {
            html += `<div class="shop-section-title">${data.label}</div><div class="shop-grid">`;
            for (const item of data.items) {
              const owned = state.ownedItems.includes(item.id);
              const equipped = state.equipped[cat] === item.id;
              let cls = "shop-item";
              if (equipped) cls += " equipped";
              else if (owned) cls += " owned";

              let priceLabel = "";
              if (equipped) priceLabel = "Equipped";
              else if (owned) priceLabel = "Tap to equip";
              else priceLabel = `🪙 ${item.price}`;

              html += `
          <div class="${cls}" data-cat="${cat}" data-id="${item.id}" data-price="${item.price}">
            ${equipped ? '<span class="shop-item-check">✓</span>' : ""}
            <span class="shop-item-preview">${item.emoji}</span>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${priceLabel}</div>
          </div>`;
            }
            html += "</div>";
          }

          // --- Upgrades section ---
          html +=
            '<div class="shop-section-title">Upgrades</div><div class="shop-grid">';
          const replyOwned = state.feedReplyUnlocked;
          html += `
      <div class="shop-item shop-item-wide ${replyOwned ? "owned" : ""}" data-upgrade="feedReply">
        ${replyOwned ? '<span class="shop-item-check">✓</span>' : ""}
        <span class="shop-item-preview">💬</span>
        <div class="shop-item-name">Feed Reply</div>
        <div class="shop-item-price">${replyOwned ? "Unlocked" : "🪙 1000"}</div>
      </div>`;
          html += "</div>";

          html += '<div class="shop-section-title">Game Keys</div><div class="shop-grid">';
          for (const game of GAME_CATALOG) {
            const owned = state.ownedGames.includes(game.id);
            html += `<div class="shop-item shop-item-wide ${owned ? "owned" : ""}" data-game="${game.id}">
              ${owned ? '<span class="shop-item-check">✓</span>' : ""}
              <span class="shop-item-preview">${game.id === "paddle-clash" ? "🏓" : game.id === "skyline-sprint" ? "🏙️" : "🔫"}</span>
              <div class="shop-item-name">${game.title}</div>
              <div class="shop-item-price">${owned ? "Unlocked" : game.price === 0 ? "Starter game" : `🪙 ${game.price}`}</div>
            </div>`;
          }
          html += "</div>";

          shopSections.innerHTML = html;

          // Upgrade click handler
          const upgradeEl = shopSections.querySelector(
            '[data-upgrade="feedReply"]',
          );
          if (upgradeEl && !state.feedReplyUnlocked) {
            upgradeEl.addEventListener("click", () => {
              if (state.coins < 1000) {
                showToast(`Need ${1000 - state.coins} more coins!`);
                return;
              }
              state.coins -= 1000;
              state.feedReplyUnlocked = true;
              state.itemsBought += 1;
              addXP(20);
              checkAchievements();
              showToast("Feed Reply unlocked! 💬");
              if (navigator.vibrate) navigator.vibrate([15, 25, 15]);
              save();
              renderShop();
              updateUI();
            });
          }

          shopSections
            .querySelectorAll(".shop-item[data-cat]")
            .forEach((el) => {
              el.addEventListener("click", () => {
                const cat = el.dataset.cat;
                const id = el.dataset.id;
                const price = parseInt(el.dataset.price);

                if (state.equipped[cat] === id) return; // already equipped

                if (state.ownedItems.includes(id)) {
                  // Equip
                  state.equipped[cat] = id;
                  showToast(
                    `Equipped ${COSMETICS[cat].items.find((i) => i.id === id).name}!`,
                  );
                } else {
                  // Buy
                  if (state.coins < price) {
                    showToast(`Need ${price - state.coins} more coins!`);
                    return;
                  }
                  state.coins -= price;
                  state.ownedItems.push(id);
                  state.equipped[cat] = id;
                  state.itemsBought += 1;
                  addXP(5);
                  checkAchievements();
                  showToast(`Bought & equipped! -${price}🪙`);
                  if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
                }

                save();
                renderShop();
                updateUI();
              });
            });

          shopSections.querySelectorAll(".shop-item[data-game]").forEach((el) => {
            el.addEventListener("click", () => {
              const game = getGame(el.dataset.game);
              if (!game || state.ownedGames.includes(game.id)) return;
              buyGame(game);
              renderShop();
            });
          });
        }

        // --- Feed ---
        let feedPostsCache = [];

        function generateFeedPosts(count = 10) {
          const posts = [];
          for (let i = 0; i < count; i++) {
            // Mix of friends and strangers
            const isFriend = state.myContacts.length > 0 && Math.random() < 0.3;
            let author;
            if (isFriend) {
              author = rand(state.myContacts);
            } else {
              const name = generateName();
              const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name + "feed")}&backgroundColor=5865f2,7c3aed,99aab5&radius=50`;
              author = { name, avatar, id: null };
            }
            const minutesAgo = Math.floor(Math.random() * 120) + 1;
            const postText = generateFeedPostText();
            const replyCount = Math.floor(Math.random() * 4);
            const replies = [];
            for (let r = 0; r < replyCount; r++) {
              const rName = generateName();
              const rAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(rName + "reply")}&backgroundColor=5865f2,7c3aed,99aab5&radius=50`;
              replies.push({
                name: rName,
                avatar: rAvatar,
                text: generateFeedReplyText(postText),
              });
            }
            posts.push({
              key: "fp_" + Date.now() + "_" + i + "_" + Math.random(),
              author,
              text: postText,
              time: minutesAgo,
              likes: Math.floor(Math.random() * 50),
              isFriend: !!author.id,
              replies,
            });
          }
          posts.sort((a, b) => a.time - b.time);
          return posts;
        }

        function renderFeed() {
          if (feedPostsCache.length === 0) {
            feedPostsCache = generateFeedPosts(10);
          }

          let html = "";
          for (const post of feedPostsCache) {
            const liked = !!state.feedLikes[post.key];
            const likeCount = post.likes + (liked ? 1 : 0);
            const timeLabel =
              post.time < 60
                ? `${post.time}m ago`
                : `${Math.floor(post.time / 60)}h ago`;

            html += `<div class="feed-post" data-key="${post.key}">
        <div class="feed-post-header">
          <img class="feed-post-avatar" src="${post.author.avatar}" alt="">
          <div class="feed-post-meta">
            <div class="feed-post-name">${escapeHTML(post.author.name)}</div>
            <div class="feed-post-time">${timeLabel}</div>
          </div>
          ${post.isFriend ? '<span class="feed-post-friend">Friend</span>' : ""}
        </div>
        <div class="feed-post-body">${escapeHTML(post.text)}</div>
        <div class="feed-post-actions">
          <button class="feed-btn feed-like ${liked ? "liked" : ""}" data-key="${post.key}">
            ${liked ? "❤️" : "🤍"} ${likeCount}
          </button>
          <button class="feed-btn feed-reply-btn ${state.feedReplyUnlocked ? "" : "reply-locked"}" data-key="${post.key}">
            💬 Reply ${state.feedReplyUnlocked ? "" : "🔒"}
          </button>
        </div>`;

            // Show existing replies
            if (post.replies.length > 0) {
              html += '<div class="feed-replies">';
              for (const r of post.replies) {
                html += `<div class="feed-reply">
            <img class="feed-reply-avatar" src="${r.avatar}" alt="">
            <div class="feed-reply-body">
              <div class="feed-reply-name">${escapeHTML(r.name)}</div>
              <div class="feed-reply-text">${escapeHTML(r.text)}</div>
            </div>
          </div>`;
              }
              html += "</div>";
            }

            html += "</div>";
          }

          html +=
            '<button class="feed-load-more" id="feedLoadMore">Load more posts</button>';
          feedList.innerHTML = html;

          // Attach handlers
          feedList.querySelectorAll(".feed-like").forEach((btn) => {
            btn.addEventListener("click", () => {
              const key = btn.dataset.key;
              if (state.feedLikes[key]) {
                delete state.feedLikes[key];
              } else {
                state.feedLikes[key] = true;
                addXP(1);
              }
              save();
              renderFeed();
            });
          });

          feedList.querySelectorAll(".feed-reply-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
              if (!state.feedReplyUnlocked) {
                showToast("Unlock Reply in the Shop for 🪙1000");
                return;
              }
              const key = btn.dataset.key;
              const post = feedPostsCache.find((p) => p.key === key);
              if (!post) return;
              // Toggle reply input
              const postEl = btn.closest(".feed-post");
              if (postEl.querySelector(".feed-reply-input")) return; // already open
              let repliesDiv = postEl.querySelector(".feed-replies");
              if (!repliesDiv) {
                repliesDiv = document.createElement("div");
                repliesDiv.className = "feed-replies";
                postEl.appendChild(repliesDiv);
              }
              const inputDiv = document.createElement("div");
              inputDiv.className = "feed-reply-input";
              inputDiv.innerHTML =
                '<input type="text" placeholder="Write a reply..." maxlength="100" autocomplete="off"><button>Send</button>';
              repliesDiv.appendChild(inputDiv);
              const inp = inputDiv.querySelector("input");
              const sendBtn = inputDiv.querySelector("button");
              inp.focus();
              const doSend = () => {
                const text = inp.value.trim();
                if (!text) return;
                post.replies.push({ name: "You", avatar: "", text });
                state.coins += 3;
                state.totalCoins += 3;
                state.messagesSent += 1;
                addXP(4);
                checkAchievements();
                save();
                updateUI();
                renderFeed();
                showToast("Reply sent! +3🪙");
              };
              sendBtn.addEventListener("click", doSend);
              inp.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  doSend();
                }
              });
            });
          });

          const loadMore = document.getElementById("feedLoadMore");
          if (loadMore) {
            loadMore.addEventListener("click", () => {
              feedPostsCache.push(...generateFeedPosts(5));
              renderFeed();
              if (navigator.vibrate) navigator.vibrate(5);
            });
          }
        }

        // --- Event handlers ---
        btnAdd.addEventListener("click", addContact);
        btnSkip.addEventListener("click", skipContact);
        btnMsg.addEventListener("click", messageContact);

        // Keyboard
        window.addEventListener("keydown", (e) => {
          if (playableOverlay.classList.contains("open")) {
            if (e.key === "Escape") closePlayable();
            return;
          }
          if (gameModal.classList.contains("open")) {
            if (e.key === "Escape") closeGameModal();
            return;
          }
          if (dmOverlay.classList.contains("open")) {
            if (e.key === "Escape") closeDM();
            return;
          }
          if (state.currentView !== "people") return;
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            addContact();
          }
          if (e.key === "ArrowRight" || e.key === "s") skipContact();
          if (e.key === "m") messageContact();
        });

        // --- Init ---
        async function init() {
          db = await openDB();
          load();
          checkStreak();
          switchView(state.currentView);
          updateUI();
          nextContact();
          renderCharPreview();
          startAllGiftTimers();
        }
        init();

        // Prevent pull-to-refresh
        let lastY = 0;
        document.addEventListener(
          "touchstart",
          (e) => (lastY = e.touches[0].clientY),
          { passive: true },
        );
        document.addEventListener(
          "touchmove",
          (e) => {
            if (e.touches[0].clientY > lastY && window.scrollY === 0)
              e.preventDefault();
          },
          { passive: false },
        );
      })();
