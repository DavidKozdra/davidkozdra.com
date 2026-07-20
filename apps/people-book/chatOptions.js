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
    return responses[Math.floor(Math.random() * responses.length)] || {
      text: "I'm not sure what to say to that yet.",
      next: [],
    };
  }

  getFeedReply(postText) {
    const normalizedText = String(postText || "").toLowerCase();
    const matchedOption = FEED_REPLY_OPTIONS.find((option) =>
      option.keywords.some((keyword) => normalizedText.includes(keyword)),
    );
    const option =
      matchedOption || FEED_REPLY_OPTIONS[FEED_REPLY_OPTIONS.length - 1];
    return option.responses[Math.floor(Math.random() * option.responses.length)];
  }

  length() {
    return CHAT_INTENTS.length;
  }
}
