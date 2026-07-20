const CHAT_INTENTS = [
  {
    id: "greeting",
    examples: [
      "hello",
      "hey",
      "yo",
      "what's up",
      "how are you",
      "you online?",
    ],
    responses: [
      {
        text: "yo! I'm online and trying to decide what to play. What are you up to?",
        next: ["invite_to_play", "rank_question", "neo_nyke"],
      },
      {
        text: "hey, what's good? I just finished a match and I'm still deciding whether to queue again.",
        next: ["invite_to_play", "good_game", "loss"],
      },
    ],
  },
  {
    id: "identity",
    keywords: ["are you ai", "are you a bot", "how smart are you", "are you real", "is this a real person"],
    examples: [
      "are you AI?",
      "are you a bot?",
      "how smart are you?",
      "are you real?",
      "what are you?",
      "is this a real person?",
    ],
    responses: [
      {
        text: "I'm one of the game contacts in this app, so I am not a real person. I can still keep a conversation going if you give me something to work with.",
        next: ["greeting", "invite_to_play"],
      },
      {
        text: "I'm an AI game contact with a small personality and a lot of opinions about games. I remember the direction of our conversation, not every detail forever.",
        next: ["greeting", "casual_chat"],
      },
    ],
  },
  {
    id: "repair",
    noRuntime: true,
    examples: [
      "I hate you",
      "you are awful",
      "you are annoying",
      "this is terrible",
      "you are being mean",
      "that made me mad",
      "you are useless",
    ],
    responses: [
      {
        text: "I'm sorry this has been frustrating. I don't want to make it worse. We can reset, or I can give you some space.",
        next: ["casual_chat", "goodbye"],
      },
      {
        text: "I'm sorry I missed the mark. I will keep it respectful—if you want to continue, tell me what you need from me.",
        next: ["casual_chat", "invite_to_play"],
      },
      {
        text: "That sounds really frustrating, and I'm sorry this interaction got there. We can start over whenever you want.",
        next: ["greeting", "goodbye"],
      },
    ],
  },
  {
    id: "user_apology",
    noRuntime: true,
    keywords: ["i'm sorry", "im sorry", "my bad", "sorry about that", "i apologize"],
    examples: ["I'm sorry", "my bad", "sorry about that", "I apologize"],
    responses: [
      {
        text: "No worries. Thanks for saying that—we can reset and keep it chill.",
        next: ["casual_chat", "invite_to_play"],
      },
      {
        text: "You're good. Let's move on and make the next message a better one.",
        next: ["casual_chat", "greeting"],
      },
    ],
  },
  {
    id: "invite_to_play",
    examples: [
      "want to play?",
      "join my game",
      "let's play together",
      "can you join me?",
      "want to queue?",
      "play some matches with me",
    ],
    responses: [
      {
        text: "Yeah, I'm down. What mode are you feeling—ranked, casual, or something chaotic?",
        next: ["choose_mode"],
      },
      {
        text: "I'm in. Send me an invite and tell me what we're running.",
        next: ["choose_mode", "invite_sent"],
      },
    ],
  },
  {
    id: "voice_chat",
    keywords: ["join vc", "voice chat", "voice call", "join call", "discord"],
    examples: [
      "join vc",
      "come to voice chat",
      "want to hop in a call?",
      "join the Discord",
      "are you in voice?",
    ],
    responses: [
      {
        text: "I cannot actually join voice from here, but I can stay in chat while you set it up. Send the lobby details when you are ready.",
        next: ["invite_sent", "invite_to_play"],
      },
      {
        text: "I am text-only in this app, but I am still down to coordinate. What are we playing?",
        next: ["choose_mode", "invite_to_play"],
      },
    ],
  },
  {
    id: "other_game",
    keywords: ["minecraft", "roblox", "fortnite", "valorant", "apex", "terraria"],
    examples: [
      "let's play Minecraft",
      "do you like Minecraft?",
      "have you played Roblox?",
      "want to play another game?",
      "what games do you like?",
    ],
    responses: [
      {
        text: "Minecraft is a solid choice. I cannot launch it from this chat, but I can talk builds, servers, or what we should play next.",
        next: ["invite_to_play", "casual_chat"],
      },
      {
        text: "I am mostly here for this game, but I am not against switching it up. What do you want to play?",
        next: ["choose_mode", "invite_to_play"],
      },
    ],
  },
  {
    id: "confirmation",
    keywords: ["ok sure", "okay sure", "sounds good", "bet"],
    examples: [
      "ok sure",
      "okay",
      "sounds good",
      "bet",
      "yeah let's do it",
      "alright",
    ],
    responses: [
      {
        text: "Perfect. I am ready when you are—send the invite or tell me what we are running.",
        next: ["invite_sent", "choose_mode"],
      },
      {
        text: "Bet. Let us actually make it happen this time instead of leaving it in the chat.",
        next: ["invite_to_play", "invite_sent"],
      },
    ],
  },
  {
    id: "casual_chat",
    examples: [
      "bro chill",
      "lol",
      "that's funny",
      "no way",
      "what are you doing?",
      "just chilling",
    ],
    responses: [
      {
        text: "I am just hanging out here and waiting for something interesting to happen. What are you doing?",
        next: ["greeting", "invite_to_play", "other_game"],
      },
      {
        text: "Fair enough. We can keep it casual, but you know I am eventually going to suggest a game.",
        next: ["invite_to_play", "goodbye"],
      },
    ],
  },
  {
    id: "choose_mode",
    examples: [
      "ranked",
      "competitive",
      "casual",
      "duos",
      "let's play ranked",
      "let's play casual",
      "I want to queue",
    ],
    responses: [
      {
        text: "Ranked sounds good. Send the invite and I'll warm up before we start losing elo.",
        next: ["invite_sent", "rank_question"],
      },
      {
        text: "Casual works. We can just mess around and see what happens.",
        next: ["invite_sent", "good_game"],
      },
    ],
  },
  {
    id: "invite_sent",
    examples: [
      "I sent the invite",
      "check your invites",
      "you should have an invite",
      "the lobby is ready",
      "join the lobby",
    ],
    responses: [
      {
        text: "Got it, joining now. Give me a second to load in and then we can run it.",
        next: ["good_game", "lag"],
      },
      {
        text: "I see it. Loading in now—let's try not to throw the first game.",
        next: ["good_game", "loss"],
      },
    ],
  },
  {
    id: "rank_question",
    examples: [
      "what rank are you?",
      "what's your rating?",
      "do you play ranked?",
      "what division are you?",
      "what's your highest rank?",
    ],
    responses: [
      {
        text: "I'm still climbing, honestly. Ranked has been rough lately, but I'm getting closer.",
        next: ["invite_to_play", "choose_mode"],
      },
      {
        text: "I'm not high enough to brag yet. Queue with me and we can suffer through it together.",
        next: ["invite_to_play", "choose_mode"],
      },
    ],
  },
  {
    id: "compliment",
    examples: [
      "nice avatar",
      "your character looks cool",
      "I like your outfit",
      "your profile looks good",
      "nice skin",
      "cool hat",
    ],
    responses: [
      {
        text: "Thanks! I just changed it. Your avatar is clean too—did you make that setup recently?",
        next: ["compliment", "invite_to_play"],
      },
      {
        text: "Appreciate it. I finally saved enough coins for that look, so I'm glad it works.",
        next: ["compliment", "trade"],
      },
    ],
  },
  {
    id: "trade",
    examples: [
      "want to trade?",
      "can I trade with you?",
      "what items do you have?",
      "do you have anything for trade?",
      "send a trade request",
    ],
    responses: [
      {
        text: "Maybe. What are you looking for, and what are you offering?",
        next: ["trade_offer"],
      },
      {
        text: "Sure, I'll check my inventory. Are you after a cosmetic, gear, or something rare?",
        next: ["trade_offer"],
      },
    ],
  },
  {
    id: "trade_offer",
    examples: [
      "I can offer you a skin",
      "I want your hat",
      "I have a rare cosmetic",
      "here's what I have",
      "I can trade gear",
      "what do you want for it?",
    ],
    responses: [
      {
        text: "That sounds interesting. Let me compare it with what I already have before I accept.",
        next: ["trade", "invite_to_play"],
      },
      {
        text: "That could work. Send the trade request and I'll take a closer look at the offer.",
        next: ["trade", "good_game"],
      },
    ],
  },
  {
    id: "good_game",
    examples: [
      "good game",
      "gg",
      "that was a great match",
      "nice game",
      "we played well",
    ],
    responses: [
      {
        text: "gg! That was a good one. We were actually cooking by the end—run it back?",
        next: ["invite_to_play", "good_game"],
      },
      {
        text: "ggs, that ending was wild. I think we can win the next one if we keep that momentum.",
        next: ["invite_to_play", "loss"],
      },
    ],
  },
  {
    id: "loss",
    examples: [
      "we lost",
      "that match was terrible",
      "we got destroyed",
      "I played badly",
      "that was rough",
    ],
    responses: [
      {
        text: "We go again. That lobby was cursed, and I refuse to let the first game count.",
        next: ["invite_to_play", "lag"],
      },
      {
        text: "That was rough, but we almost had it. Let's reset and try a different approach next game.",
        next: ["choose_mode", "invite_to_play"],
      },
    ],
  },
  {
    id: "lag",
    examples: [
      "I'm lagging",
      "my ping is bad",
      "the server is lagging",
      "my game froze",
      "I disconnected",
    ],
    responses: [
      {
        text: "Same, the server feels weird. Try reconnecting and I'll wait for you.",
        next: ["invite_sent", "invite_to_play"],
      },
      {
        text: "Your character was teleporting on my screen too. Restart and let me know when you're back.",
        next: ["invite_sent", "goodbye"],
      },
    ],
  },
  {
    id: "neo_nyke",
    examples: [
      "what is Neo Nyke?",
      "want to play Neo Nyke?",
      "have you played Neo Nyke?",
      "send me the Neo Nyke game",
      "let's do a Neo Nyke run",
    ],
    responses: [
      {
        text: "Yeah, let's run it. The dungeon keeps destroying me, but I think I can beat my score tonight.",
        next: ["neo_nyke_progress", "invite_to_play"],
      },
      {
        text: "You can play it here: https://neonyke.davidkozdra.workers.dev/ — send me your high score after your run.",
        next: ["neo_nyke_progress"],
      },
    ],
  },
  {
    id: "neo_nyke_progress",
    examples: [
      "my Neo Nyke score is",
      "I got a new high score",
      "I died in the dungeon",
      "I made it to the next level",
      "the dungeon killed me",
      "I beat my score",
    ],
    responses: [
      {
        text: "Nice! That's progress. The dungeon gets meaner later, so I'm curious how far you can push that run.",
        next: ["neo_nyke", "good_game"],
      },
      {
        text: "That game is brutal. Tell me your score when you try again—we need a proper leaderboard.",
        next: ["neo_nyke", "invite_to_play"],
      },
    ],
  },
  {
    id: "goodbye",
    examples: [
      "goodbye",
      "I'm leaving",
      "I'm getting offline",
      "see you later",
      "goodnight",
      "I have to go",
    ],
    responses: [
      {
        text: "Later! Message me when you're back and we'll finish that conversation.",
        next: ["greeting"],
      },
      {
        text: "Have a good one. Catch you next time—we still owe ourselves a win.",
        next: ["greeting", "invite_to_play"],
      },
    ],
  },
];

const FEED_REPLY_OPTIONS = [
  {
    id: "achievement",
    keywords: ["level", "streak", "high score", "new account", "saved up"],
    responses: [
      "Huge W. That kind of progress takes a while, especially the streak.",
      "Nice! You were clearly grinding for that one. What are you going for next?",
      "Let's gooo, that's a milestone worth posting. Keep the momentum going.",
    ],
  },
  {
    id: "squad",
    keywords: ["squad", "squad up", "bored", "anyone wanna", "who else"],
    responses: [
      "I'm down if you still need someone. What are you trying to run?",
      "Same honestly. We should put a group together and make a lobby.",
      "This is your sign to send invites instead of waiting for everyone else.",
    ],
  },
  {
    id: "cosmetic",
    keywords: ["cosmetic", "avatar", "fit", "drip", "hat", "cape", "glasses", "armor"],
    responses: [
      "That setup is clean. The accessories actually work together instead of fighting for attention.",
      "Okay, that look is better than I expected. Where did you find the main piece?",
      "Honestly? Easy W. I would keep that loadout exactly as it is.",
    ],
  },
  {
    id: "coins",
    keywords: ["coins", "tycoon", "collection", "shop", "gift"],
    responses: [
      "The coin grind is real. Save a little longer—you'll be glad you did when the next item drops.",
      "I had the same problem. Every time I save up, the shop adds something else I want.",
      "You might be closer than you think. Check the shop and gifts before starting another grind.",
    ],
  },
  {
    id: "question",
    keywords: ["why", "how", "tips", "rate", "who designed", "anyone got"],
    responses: [
      "I was wondering the same thing. Someone with more experience needs to explain this.",
      "My advice is to try it once and adjust from there. The usual strategy is not always the best one.",
      "That deserves a real answer, not just a reaction. What have you tried so far?",
    ],
  },
  {
    id: "gameplay",
    keywords: ["sweaty", "ggs", "game", "addicting", "best game"],
    responses: [
      "For real, I said I was playing one match and somehow lost the entire evening.",
      "The lobbies have been intense today, but that makes the good games feel even better.",
      "Same. There is always one more match, one more unlock, or one more thing to test.",
    ],
  },
  {
    id: "general",
    keywords: [],
    responses: [
      "This is a solid update. I need to know what happened after this.",
      "Honestly, this is the kind of post that makes me want to log back in.",
      "Valid. Keep us posted if anything else happens.",
      "I can relate to this way more than I expected.",
    ],
  },
];

const RUNTIME_OPENERS = [
  "Honestly",
  "Not gonna lie",
  "For real",
  "Okay",
  "No way",
  "I was just thinking that",
  "That is actually wild",
  "You know what",
  "Lowkey",
  "Wait",
];

const RUNTIME_CLOSERS = {
  achievement: [
    "What are you going for next?",
    "That is a milestone worth celebrating.",
    "Keep the momentum going.",
    "I need to see the next update.",
    "You are closer than you think.",
    "That grind is finally paying off.",
    "Do not stop now.",
    "The next goal is going to be even better.",
    "I would be showing that off too.",
    "That deserves a victory lap.",
  ],
  squad: [
    "What are you trying to run?",
    "Send an invite if you still need someone.",
    "We should put a group together.",
    "I would join that lobby.",
    "This feels like the start of a good session.",
    "Let us make it happen instead of just talking about it.",
    "Someone needs to make the lobby.",
    "I am curious who else is down.",
    "That sounds more fun with a full squad.",
    "I will check who is online.",
  ],
  cosmetic: [
    "Where did you find the main piece?",
    "That is an easy W.",
    "I would keep that loadout exactly as it is.",
    "The colors work together really well.",
    "That might be my favorite setup today.",
    "Now I want to change my own avatar.",
    "You should definitely keep posting fits like this.",
    "That look has way more personality than the default gear.",
    "I did not expect that combination to work so well.",
    "The shop needs more items like that.",
  ],
  coins: [
    "What are you saving for?",
    "The shop always finds a way to empty my wallet.",
    "I would hold onto a few coins for the next drop.",
    "Check your gifts before starting another grind.",
    "That next purchase is going to feel earned.",
    "The economy in this game is kind of ridiculous.",
    "I keep spending mine on things I did not plan to buy.",
    "You are probably closer to the goal than it feels.",
    "Let us compare collections sometime.",
    "The grind is painful, but the good items are worth it.",
  ],
  question: [
    "What have you tried so far?",
    "Someone with more experience needs to answer this.",
    "I want to hear what everyone else thinks.",
    "There are probably a few ways to approach it.",
    "That deserves a real answer instead of just a reaction.",
    "I am curious where this goes.",
    "Maybe we can test it together.",
    "That is a better question than people are giving it credit for.",
    "I have a theory, but I am not completely sure.",
    "Keep us posted if you figure it out.",
  ],
  gameplay: [
    "There is always time for one more match.",
    "The good games make all the rough ones worth it.",
    "I said the same thing and then queued again.",
    "That is exactly how the evening disappears.",
    "The lobbies have been intense lately.",
    "I am still trying to decide whether that is a good thing.",
    "At least the game is keeping things interesting.",
    "That is probably why I keep coming back.",
    "The next match could be the best one yet.",
    "I know I should log off, but I probably will not.",
  ],
  general: [
    "What happened after this?",
    "I need to know how this turns out.",
    "Keep us posted.",
    "This makes me want to log back in.",
    "I can relate to this way more than I expected.",
    "That is a solid update.",
    "Someone else has definitely had the same experience.",
    "This is exactly the kind of post I open the feed for.",
    "I am invested now.",
    "That deserves a follow-up post.",
  ],
};

const RUNTIME_TOPIC_BY_NODE = {
  greeting: "general",
  identity: "general",
  invite_to_play: "squad",
  voice_chat: "squad",
  other_game: "gameplay",
  confirmation: "squad",
  casual_chat: "general",
  choose_mode: "gameplay",
  invite_sent: "squad",
  rank_question: "gameplay",
  compliment: "cosmetic",
  trade: "coins",
  trade_offer: "coins",
  good_game: "gameplay",
  loss: "gameplay",
  lag: "gameplay",
  neo_nyke: "gameplay",
  neo_nyke_progress: "achievement",
  goodbye: "general",
};

const FAKE_CONVERSATIONS = [
  [
    { sender: "them", text: "yo, you online?" },
    { sender: "me", text: "yeah, what are we running?" },
    { sender: "them", text: "duos if you are down. I need a teammate who will not rage quit." },
    { sender: "me", text: "send the invite, I am getting on now." },
  ],
  [
    { sender: "them", text: "I finally changed my avatar and I cannot tell if it is clean or too much." },
    { sender: "me", text: "send it over, I will rate it honestly." },
    { sender: "them", text: "okay, but do not pretend the hat is good if it is not." },
    { sender: "me", text: "the hat stays. It gives the whole outfit a little personality." },
  ],
  [
    { sender: "them", text: "I tried Neo Nyke again and the dungeon ended my run immediately." },
    { sender: "me", text: "what score did you get this time?" },
    { sender: "them", text: "not enough to brag about, but I made it farther than yesterday." },
    { sender: "me", text: "that still counts. Send me the score and I will try to beat it." },
  ],
  [
    { sender: "them", text: "are you getting on later?" },
    { sender: "me", text: "probably. I am finishing something first." },
    { sender: "them", text: "cool, message me when you are free and we can run a few casual games." },
    { sender: "me", text: "sounds good. I will bring the questionable loadout." },
  ],
  [
    { sender: "them", text: "the shop has too many good items today." },
    { sender: "me", text: "I know. I was saving coins and then the new cape appeared." },
    { sender: "them", text: "that is how they get us. We need a better budget system." },
    { sender: "me", text: "agreed, but I am still buying it before it rotates out." },
  ],
];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getFeedOption(postText) {
  const normalizedText = String(postText || "").toLowerCase();
  return (
    FEED_REPLY_OPTIONS.find((option) =>
      option.keywords.some((keyword) => normalizedText.includes(keyword)),
    ) || FEED_REPLY_OPTIONS[FEED_REPLY_OPTIONS.length - 1]
  );
}

function composeRuntimeReply(text, topic) {
  const closers = RUNTIME_CLOSERS[topic] || RUNTIME_CLOSERS.general;
  const startsConversation =
    /^(yo|hey|yeah|i(?:'m|\b)|you\b|later|have\b|gg|same|that\b|maybe|sure|ranked|casual|got it|okay|ok|wait|no way)\b/i.test(
      text,
    );
  const body = startsConversation
    ? text
    : text
      ? text[0].toLowerCase() + text.slice(1)
      : text;
  const opener = startsConversation ? "" : `${randomItem(RUNTIME_OPENERS)}, `;
  return `${opener}${body} ${randomItem(closers)}`;
}

class ChatOptionsManager {
  get() {
    return CHAT_INTENTS;
  }

  getNode(id) {
    return CHAT_INTENTS.find((intent) => intent.id === id) || null;
  }

  getCandidates(ids) {
    if (!ids || ids.length === 0) return CHAT_INTENTS;
    return ids.map((id) => this.getNode(id)).filter(Boolean);
  }

  getResponse(node) {
    const responses = node.responses || [];
    const response = randomItem(responses) || {
      text: "I'm not sure what to say to that yet.",
      next: [],
    };
    return {
      ...response,
      text: node.noRuntime
        ? response.text
        : composeRuntimeReply(
            response.text,
            RUNTIME_TOPIC_BY_NODE[node.id] || "general",
          ),
    };
  }

  getFeedReply(postText) {
    const option = getFeedOption(postText);
    return composeRuntimeReply(randomItem(option.responses), option.id);
  }

  getFakeConversation() {
    return randomItem(FAKE_CONVERSATIONS).map((message) => ({ ...message }));
  }

  length() {
    return CHAT_INTENTS.length;
  }
}
