// EventSystem.js — Random travel events
/**
 * Manages random travel events that occur during gameplay.
 * Handles event triggering, timing, resolution, and player choices.
 */
let CountdownTimerCtor = null;
let eventEngineApi = null;
if (typeof require === "function") {
  try {
    ({ CountdownTimer: CountdownTimerCtor } = require("../Time/countdownTimer"));
  } catch (_err) {}
  try {
    eventEngineApi = require("./eventEngine");
  } catch (_err) {}
}

class EventSystem {
  /**
   * Creates a new EventSystem.
   * @param {Object} [options] - Configuration options
   * @param {Object} [options.eventEngine] - Event engine API
   * @param {Function} [options.CountdownTimer] - Countdown timer constructor
   */
  constructor(options = {}) {
    const opts = options || {};
    this.tilesMoved = 0;
    this.checkInterval = 20; // Check every 20 tiles moved
    this.eventChance = 0.10; // 10% chance per check
    this.currentEvent = null;
    this._returnState = null;
    this.eventHistory = [];
    this.maxHistory = 30;
    this._eventEngine = opts.eventEngine || eventEngineApi;

    // Countdown timer for active events
    const Timer = opts.CountdownTimer || CountdownTimerCtor;
    if (typeof Timer === 'function') {
      this._countdown = new Timer();
    } else {
      // Fallback keeps legacy behavior if lib is unavailable.
      this._countdown = {
        _id: null,
        _deadline: 0,
        start: function (seconds, onExpire) {
          this.clear();
          this._deadline = Date.now() + seconds * 1000;
          this._id = setTimeout(() => {
            this._id = null;
            this._deadline = 0;
            if (typeof onExpire === 'function') onExpire();
          }, seconds * 1000);
        },
        clear: function () {
          if (this._id) clearTimeout(this._id);
          this._id = null;
          this._deadline = 0;
        },
        remainingSeconds: function () {
          if (!this._deadline) return 0;
          return Math.max(0, Math.ceil((this._deadline - Date.now()) / 1000));
        },
      };
    }

    this.events = this.defineEvents();
  }

  /** Preferred state to return to after an event/minigame resolves. */
  /**
   * Gets the preferred state to return to after event resolution.
   * @returns {string} State name
   * @private
   */
  _getPostEventState() {
    if (this._returnState) return this._returnState;
    return window._isCityManageMode ? GameStates.CITY_MANAGE : GameStates.PLAYING;
  }

  /** Return to active gameplay mode safely. */
  /**
   * Returns to the appropriate game state after an event resolves.
   * @private
   */
  _returnToGameState() {
    const target = this._getPostEventState();
    this._returnState = null;
    if (typeof gameStateManager !== 'undefined' && gameStateManager.currentState !== target) {
      gameStateManager.setState(target);
    }
  }

  destroy() {
    /**
     * Cleans up the event system, clearing timers.
     */
    this.clearEventTimer();
  }

  /** Clear any active event countdown */
  /**
   * Clears the active event countdown timer.
   */
  clearEventTimer() {
    this._countdown.clear();
  }

  /** Start countdown for current event. When it expires, auto-resolve the worst choice. */
  /**
   * Starts a countdown timer for the current event.
   * @param {number} seconds - Time in seconds before auto-resolution
   */
  startEventTimer(seconds) {
    this.clearEventTimer();
    this._countdown.start(this._getScaledEventTimeLimit(seconds), () => {
      if (!this.currentEvent) return;

      // Grab event info before we clear it
      const evt = this.currentEvent;
      const worst = evt.worstChoice ?? evt.choices.length - 1;
      const choice = evt.choices[worst];

      // Resolve the consequence
      let result = this._resolveEventChoice(choice, 'timed event');

      // Build a proper timeout message: event-specific flavor + actual consequence
      const timeoutFlavor = evt.timeoutMessage || `You hesitated too long!`;
      const fullMessage = `⏰ ${timeoutFlavor}\n\n${result.message}`;
      result.message = fullMessage;
      result.type = result.type || 'error';

      if (typeof notificationManager !== 'undefined') {
        notificationManager.log(`⏰ ${timeoutFlavor}`, 'error');
      }

      // Clear event AFTER resolving (so UI can still show result)
      this.currentEvent = null;

      // Show result in the event popup (stays visible until player clicks Continue)
      if (typeof showEventResult === 'function') showEventResult(result);
    });
  }

  /** Seconds remaining on current event timer, or 0 */
  /**
   * Gets remaining seconds on the event timer.
   * @returns {number} Seconds remaining
   */
  getTimerRemaining() {
    return this._countdown.remainingSeconds();
  }

  _getDifficultyConfig() {
    const config = typeof window !== 'undefined' && window.DIFFICULTY_CONFIG && typeof window.DIFFICULTY_CONFIG === 'object'
      ? window.DIFFICULTY_CONFIG
      : {};
    return {
      eventCheckIntervalMultiplier: Number(config.eventCheckIntervalMultiplier || 1),
      eventChanceMultiplier: Number(config.eventChanceMultiplier || 1),
      eventTimerMultiplier: Number(config.eventTimerMultiplier || 1),
      eventPenaltyMultiplier: Number(config.eventPenaltyMultiplier || 1),
    };
  }

  _getScaledCheckInterval() {
    const config = this._getDifficultyConfig();
    return Math.max(6, Math.round(this.checkInterval * config.eventCheckIntervalMultiplier));
  }

  _getScaledEventChance() {
    const config = this._getDifficultyConfig();
    return Math.max(0, Math.min(0.95, this.eventChance * config.eventChanceMultiplier));
  }

  _getScaledEventTimeLimit(seconds) {
    const config = this._getDifficultyConfig();
    return Math.max(5, Math.round(Number(seconds || 0) * config.eventTimerMultiplier));
  }

  _capturePenaltySnapshot() {
    return {
      gold: Math.max(0, Number(player?.gold || 0)),
      hp: Math.max(0, Number(player?.hp || 0)),
      boatCondition: player?.activeBoat ? Math.max(0, Number(player.activeBoat.condition || 0)) : null,
    };
  }

  _applyDifficultyPenaltyScaling(snapshot, result) {
    if (!snapshot || !result || typeof result !== 'object') return result;
    const type = String(result.type || 'info');
    if (type !== 'warning' && type !== 'error') return result;

    const config = this._getDifficultyConfig();
    const penaltyMultiplier = Number(config.eventPenaltyMultiplier || 1);
    if (!Number.isFinite(penaltyMultiplier) || Math.abs(penaltyMultiplier - 1) < 0.001) return result;

    const adjustmentNotes = [];
    const currentGold = Math.max(0, Number(player?.gold || 0));
    const goldLoss = Math.max(0, snapshot.gold - currentGold);
    if (goldLoss > 0) {
      const targetLoss = Math.max(0, Math.round(goldLoss * penaltyMultiplier));
      const delta = targetLoss - goldLoss;
      if (delta > 0) {
        const extraGold = Math.min(Math.max(0, Number(player?.gold || 0)), delta);
        if (extraGold > 0 && typeof player?.spendGold === 'function') {
          player.spendGold(extraGold);
          adjustmentNotes.push(`gold penalty +${extraGold}`);
        }
      } else if (delta < 0) {
        const refund = Math.abs(delta);
        if (refund > 0) {
          if (typeof player?.earnGold === 'function') player.earnGold(refund);
          else if (player) player.gold = currentGold + refund;
          adjustmentNotes.push(`gold refund ${refund}`);
        }
      }
    }

    const currentHp = Math.max(0, Number(player?.hp || 0));
    const hpLoss = Math.max(0, snapshot.hp - currentHp);
    if (hpLoss > 0) {
      const targetLoss = Math.max(0, Math.round(hpLoss * penaltyMultiplier));
      const delta = targetLoss - hpLoss;
      if (delta > 0) {
        if (typeof player?.takeDamage === 'function') {
          player.takeDamage(delta);
          adjustmentNotes.push(`HP penalty +${delta}`);
        }
      } else if (delta < 0 && player) {
        const heal = Math.abs(delta);
        player.hp = Math.min(Number(player.maxHp || player.hp || 0), Number(player.hp || 0) + heal);
        adjustmentNotes.push(`HP restored ${heal}`);
      }
    }

    if (snapshot.boatCondition !== null && player?.activeBoat) {
      const currentCondition = Math.max(0, Number(player.activeBoat.condition || 0));
      const hullLoss = Math.max(0, snapshot.boatCondition - currentCondition);
      if (hullLoss > 0) {
        const targetLoss = Math.max(0, Math.round(hullLoss * penaltyMultiplier));
        const delta = targetLoss - hullLoss;
        if (delta > 0) {
          if (typeof player.activeBoat.applyDamage === 'function') {
            player.activeBoat.applyDamage(delta);
            adjustmentNotes.push(`hull penalty +${delta}`);
          }
        } else if (delta < 0) {
          const repair = Math.abs(delta);
          player.activeBoat.condition = Math.min(100, currentCondition + repair);
          adjustmentNotes.push(`hull restored ${repair}`);
        }
      }
    }

    if (adjustmentNotes.length > 0) {
      const difficultyNote = penaltyMultiplier > 1 ? 'Difficulty increased the penalty.' : 'Difficulty softened the penalty.';
      result.message = `${result.message}\n\n${difficultyNote} ${adjustmentNotes.join(', ')}.`;
    }
    return result;
  }

  _resolveEventChoice(choice, sourceLabel = 'choice') {
    const snapshot = this._capturePenaltySnapshot();
    let result;
    try {
      result = choice.resolve();
    } catch (err) {
      console.error(`[EventSystem] ${sourceLabel} resolve failed:`, err);
      result = {
        message: 'The event failed to resolve correctly. You continue your journey.',
        type: 'error',
      };
    }

    if (!result || typeof result !== 'object') {
      result = { message: 'The event concludes.', type: 'info' };
    }

    return this._applyDifficultyPenaltyScaling(snapshot, result);
  }

  /**
   * Stat check helper: scales a base probability by a player stat.
   * Each stat point adds bonusPerPoint to the base chance, capped at 95%.
   * @param {number} baseProbability - base chance (0 to 1)
   * @param {number} statValue - the player's stat value (e.g. player.bonusCharm)
   * @param {number} [bonusPerPoint=0.06] - probability added per stat point
   * @returns {number} adjusted probability, capped at 0.95
   */
  statCheck(baseProbability, statValue, bonusPerPoint = 0.06) {
    return Math.min(baseProbability + (statValue || 0) * bonusPerPoint, 0.95);
  }

  /**
   * Format a stat-checked choice label showing the player's actual odds.
   * @param {string} baseText - choice label without percentage
   * @param {number} baseProbability - base chance
   * @param {number} statValue - player stat
   * @param {string} statAbbr - stat abbreviation (ATK, DEF, MAG, CHA, HP)
   * @returns {string} formatted label like "Sneak past (46% — DEF)"
   */
  statLabel(baseText, baseProbability, statValue, statAbbr) {
    const pct = Math.round(this.statCheck(baseProbability, statValue) * 100);
    return `${baseText} (${pct}% — ${statAbbr})`;
  }

  onPlayerMoved() {
    /**
     * Called when player moves. Checks for random event triggers.
     */
    if (gameStateManager.is(GameStates.COMBAT) || gameStateManager.is(GameStates.RANDOM_EVENT)) return;
    if (player.currentCity) return; // No events in cities

    this.tilesMoved++;
    if (this.tilesMoved >= this._getScaledCheckInterval()) {
      this.tilesMoved = 0;
      if (Math.random() < this._getScaledEventChance()) {
        this.triggerRandomEvent();
      }
    }
  }

  triggerRandomEvent() {
    /**
     * Triggers a random event based on terrain, season, and day.
     */
    const terrain = grid[player.y]?.[player.x]?.options[0] || 'Grass';
    const season = dayNight.getSeason();
    const day = dayNight.getDaysElapsed();
    const eventEngine = this._eventEngine;
    const eventContext = { terrain, season, day };

    // Filter eligible events
    const eligible = (eventEngine && typeof eventEngine.filterEligibleEvents === "function")
      ? eventEngine.filterEligibleEvents(this.events, eventContext)
      : this.events.filter(e => {
          if (e.minDay && day < e.minDay) return false;
          if (e.terrain && !e.terrain.includes(terrain)) return false;
          if (e.season && !e.season.includes(season)) return false;
          return true;
        });

    if (eligible.length === 0) return;

    const event = (eventEngine && typeof eventEngine.pickRandomEvent === "function")
      ? eventEngine.pickRandomEvent(eligible, Math.random)
      : eligible[Math.floor(Math.random() * eligible.length)];
    this._returnState = window._isCityManageMode ? GameStates.CITY_MANAGE : GameStates.PLAYING;
    this.currentEvent = { ...event, triggered: day, terrain, season };

    // Start countdown timer if event has a time limit
    if (event.timeLimit) {
      this.startEventTimer(event.timeLimit);
    }

    const historyEntry = {
      name: event.name,
      day,
      terrain,
      season,
    };
    this.eventHistory = (eventEngine && typeof eventEngine.appendHistory === "function")
      ? eventEngine.appendHistory(this.eventHistory, historyEntry, this.maxHistory)
      : this.eventHistory.concat([historyEntry]).slice(-this.maxHistory);

    gameStateManager.setState(GameStates.RANDOM_EVENT);
  }

  resolveChoice(choiceIndex) {
    /**
     * Resolves a player's choice in the current event.
     * @param {number} choiceIndex - Index of the chosen option
     * @returns {Object} Result with message and type
     */
    if (!this.currentEvent || !this.currentEvent.choices[choiceIndex]) return;

    // Clear countdown timer when player makes a choice
    this.clearEventTimer();

    const choice = this.currentEvent.choices[choiceIndex];
    const result = this._resolveEventChoice(choice);

    if (typeof notificationManager !== 'undefined') {
      notificationManager.log(result.message, result.type || "info");
    }

    this.currentEvent = null;
    // Don't override if the event launched combat or a minigame
    if (gameStateManager.currentState !== GameStates.COMBAT &&
        gameStateManager.currentState !== GameStates.MINIGAME) {
      this._returnToGameState();
    }

    return result;
  }

  defineEvents() {
    const es = this; // reference for stat checks inside event closures
    const contrabandCatalog = (typeof SmugglingSystem !== 'undefined' && typeof SmugglingSystem.getContrabandCatalog === 'function')
      ? SmugglingSystem.getContrabandCatalog()
      : {};
    const isContrabandKey = (itemKey) => {
      if (!itemKey) return false;
      if (ItemLibrary[itemKey]?.tags?.has('contraband')) return true;
      return !!contrabandCatalog[itemKey];
    };
    const seizeAllContraband = () => {
      const seized = { totalQty: 0, typeCount: 0 };
      const seizedTypes = new Set();

      // Seize contraband from normal inventory.
      const invKeys = [...player.inventory.keys()].filter(isContrabandKey);
      for (const key of invKeys) {
        const entry = player.inventory.get(key);
        const qty = Math.max(0, entry?.quantity || 0);
        if (qty <= 0) continue;
        seizedTypes.add(key);
        seized.totalQty += qty;
        for (let i = 0; i < qty; i++) player.removeItem({ name: key });
      }

      // Seize contraband from smuggling hold (separate from player inventory).
      if (typeof smugglingSystem !== 'undefined' && smugglingSystem && Array.isArray(smugglingSystem.smugglingCargo)) {
        const kept = [];
        for (const stack of smugglingSystem.smugglingCargo) {
          const key = stack?.itemKey;
          const qty = Math.max(0, stack?.quantity || 0);
          if (qty <= 0) continue;
          if (isContrabandKey(key)) {
            seizedTypes.add(key);
            seized.totalQty += qty;
          } else {
            kept.push(stack);
          }
        }
        smugglingSystem.smugglingCargo = kept;
      }

      seized.typeCount = seizedTypes.size;
      return seized;
    };
    const resolveRoadInspection = (fineBase, fineSpread) => {
      const seized = seizeAllContraband();
      if (seized.totalQty > 0) {
        const fine = fineBase + Math.floor(Math.random() * fineSpread);
        const paid = Math.min(player.gold, fine);
        if (paid > 0) player.spendGold(paid);
        return {
          message: `Contraband confiscated! Fined ${paid} gold. Seized ${seized.totalQty} total item(s) across ${seized.typeCount} type(s).`,
          type: "error",
        };
      }
      return { message: "All clear! The guards wave you through.", type: "success" };
    };
    return [
      {
        name: "Broken Wheel",
        description: "Your cart has hit a rock and broken a wheel! You need to repair it or lose time.",
        terrain: ['Rock', 'Sand', 'Grass'],
        timeLimit: 20,
        worstChoice: 1,
        timeoutMessage: "The wheel splinters further while you dither — you're forced to jury-rig a fix!",
        choices: [
          {
            text: "Pay 15 gold to repair (quick fix)",
            resolve: () => {
              if (player.gold >= 15) {
                player.spendGold(15);
                return { message: "Wheel repaired for 15 gold. Onward!", type: "info" };
              }
              return { message: "Not enough gold! You waste half a day fixing it.", type: "warning" };
            }
          },
          {
            text: () => es.statLabel('Attempt repair yourself', 0.5, player.bonusDefense, 'DEF'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.5, player.bonusDefense)) {
                return { message: "You skillfully repair the wheel. No cost!", type: "success" };
              }
              return { message: "Repair failed. You lose a day struggling with it.", type: "error" };
            }
          },
        ]
      },
      {
        name: "Wandering Merchant",
        description: "A mysterious merchant appears with exotic goods. They offer you a special deal.",
        terrain: ['Grass', 'Sand', 'Forest', 'Rock', 'Snow'],
        timeLimit: 18,
        worstChoice: 2,
        timeoutMessage: "The merchant grows impatient and vanishes before you can decide.",
        choices: [
          {
            text: "Buy rare Spices at a discount (40 gold)",
            resolve: () => {
              if (player.gold >= 40 && ItemLibrary['Spices']) {
                player.spendGold(40);
                const added = player.addItem({ name: 'Spices', quantity: 2 });
                if (!added) {
                  player.earnGold(40); // refund
                  return { message: "Your cargo is full! The merchant shakes their head.", type: "warning" };
                }
                return { message: "Bought 2 Spices for 40 gold!", type: "success" };
              } else if (player.gold >= 40) {
                player.spendGold(40);
                const added = player.addItem({ name: 'Herbs', quantity: 3 });
                if (!added) {
                  player.earnGold(40); // refund
                  return { message: "Your cargo is full! The merchant shakes their head.", type: "warning" };
                }
                return { message: "Bought 3 Herbs for 40 gold!", type: "success" };
              }
              return { message: "You can't afford it. The merchant shrugs and leaves.", type: "warning" };
            }
          },
          {
            text: "Trade 2 random items for something valuable",
            resolve: () => {
              const keys = [...player.inventory.keys()];
              if (keys.length >= 2) {
                // Shuffle keys for true randomness
                for (let i = keys.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [keys[i], keys[j]] = [keys[j], keys[i]];
                }
                player.removeItem({ name: keys[0] });
                player.removeItem({ name: keys[1] });
                const reward = Math.random() > 0.5 ? 'Jewelry' : 'Wine';
                if (ItemLibrary[reward]) {
                  player.addItem({ name: reward, quantity: 1 });
                  return { message: `Traded for 1 ${reward}! Great deal.`, type: "success" };
                }
                player.earnGold(50);
                return { message: "Traded for 50 gold!", type: "success" };
              }
              return { message: "You don't have enough items to trade.", type: "warning" };
            }
          },
          {
            text: () => es.statLabel('Haggle for a freebie', 0.35, player.bonusCharm, 'CHA'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.35, player.bonusCharm)) {
                const freebies = ['Herbs', 'Spices', 'Silk'];
                const pick = freebies[Math.floor(Math.random() * freebies.length)];
                if (ItemLibrary[pick]) {
                  player.addItem({ name: pick, quantity: 1 });
                  return { message: `"Fine, take a free ${pick}. You drive a hard bargain!"`, type: "success" };
                }
                player.earnGold(20);
                return { message: `"Here's 20 gold for your trouble. You're too charming!"`, type: "success" };
              }
              return { message: `"Nice try. Buy something or leave."`, type: "info" };
            }
          },
          {
            text: "Decline and move on",
            resolve: () => {
              return { message: "The merchant vanishes into the mist.", type: "info" };
            }
          }
        ]
      },
      {
        name: "Fierce Storm",
        description: "Dark clouds gather and a violent storm rolls in. The wind howls around you!",
        terrain: ['Grass', 'Sand', 'Snow'],
        season: ['Spring', 'Fall'],
        timeLimit: 15,
        worstChoice: 1,
        timeoutMessage: "The storm hits before you can find cover — you're caught in the open!",
        choices: [
          {
            text: "Seek shelter and wait it out",
            resolve: () => {
              return { message: "You find shelter. Lost a few hours but stayed safe.", type: "info" };
            }
          },
          {
            text: () => es.statLabel('Press on through the storm', 0.7, player.bonusDefense, 'DEF'),
            resolve: () => {
              if (Math.random() < (1 - es.statCheck(0.7, player.bonusDefense))) {
                // Lose perishable
                const perishables = [...player.inventory.entries()]
                  .filter(([k, v]) => ItemLibrary[k]?.perishable);
                if (perishables.length > 0) {
                  const [key] = perishables[Math.floor(Math.random() * perishables.length)];
                  player.removeItem({ name: key });
                  return { message: `The storm ruined 1 ${key}!`, type: "error" };
                }
                // No perishables but still failed — minor gold penalty
                const stormGold = Math.min(player.gold, 5);
                if (stormGold > 0) player.spendGold(stormGold);
                return { message: `The storm batters you! Lost ${stormGold} gold in supplies.`, type: "warning" };
              }
              return { message: "You brave the storm and emerge unscathed!", type: "success" };
            }
          }
        ]
      },
      {
        name: "Abandoned Camp",
        description: "You discover an abandoned campsite. The embers are still warm...",
        terrain: ['Grass', 'Forest', 'Sand', 'Rock', 'Snow'],
        choices: [
          {
            text: () => es.statLabel('Search the camp', 0.7, player.bonusAttack, 'ATK'),
            resolve: () => {
              if (Math.random() < (1 - es.statCheck(0.7, player.bonusAttack))) {
                const lost = Math.min(player.gold, 10);
                if (lost > 0) player.spendGold(lost);
                return { message: `It was a trap! Bandits stole ${lost} gold!`, type: "error" };
              }
              const goldFound = 5 + Math.floor(Math.random() * 25);
              player.earnGold(goldFound);
              return { message: `Found ${goldFound} gold in the campsite!`, type: "success" };
            }
          },
          {
            text: "Leave it alone",
            resolve: () => {
              return { message: "Better safe than sorry. You move on.", type: "info" };
            }
          }
        ]
      },
      {
        name: "Festival Rumor",
        description: "A passing traveler tells you of an upcoming celebration in a distant city!",
        terrain: ['Grass', 'Forest', 'Sand', 'Rock', 'Snow'],
        minDay: 5,
        choices: [
          {
            text: "Ask for details",
            resolve: () => {
              if (typeof cities !== 'undefined' && cities.length > 0) {
                const city = cities[Math.floor(Math.random() * cities.length)];
                const items = Object.keys(ItemLibrary);
                const item = items[Math.floor(Math.random() * items.length)];
                return {
                  message: `"${city.name} will celebrate a ${item} festival soon! Prices will soar."`,
                  type: "info"
                };
              }
              return { message: "The traveler's mumbling is hard to understand.", type: "info" };
            }
          },
          {
            text: () => es.statLabel('Coax specific trade tips', 0.45, player.bonusCharm, 'CHA'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.45, player.bonusCharm)) {
                const gold = 15 + Math.floor(Math.random() * 25);
                player.earnGold(gold);
                return { message: `Your charm wins them over — they share a trade secret and ${gold} gold tip!`, type: "success" };
              }
              return { message: "The traveler clams up. 'Buy my book if you want real tips!'", type: "info" };
            }
          },
          {
            text: "Ignore the gossip",
            resolve: () => {
              return { message: "You nod politely and continue walking.", type: "info" };
            }
          }
        ]
      },
      {
        name: "River Crossing",
        description: "A swollen river blocks your path. The bridge has collapsed!",
        terrain: ['Grass', 'Forest'],
        timeLimit: 20,
        worstChoice: 0,
        timeoutMessage: "The river keeps rising — you're forced to wade across before it's too late!",
        choices: [
          {
            text: () => es.statLabel('Wade across (risky)', 0.75, Math.floor((player.bonusMaxHP || 0) / 3), 'HP'),
            resolve: () => {
              if (Math.random() < (1 - es.statCheck(0.75, Math.floor((player.bonusMaxHP || 0) / 3)))) {
                const items = [...player.inventory.keys()];
                if (items.length > 0) {
                  const lost = items[Math.floor(Math.random() * items.length)];
                  player.removeItem({ name: lost });
                  return { message: `You made it across but dropped 1 ${lost} in the current!`, type: "warning" };
                }
                // No items but still failed — take minor HP damage
                const dmg = 1 + Math.floor(Math.random() * 2);
                if (player.takeDamage) player.takeDamage(dmg);
                return { message: `You made it across but got battered by the current! (-${dmg} HP)`, type: "warning" };
              }
              return { message: "You wade across safely!", type: "success" };
            }
          },
          {
            text: "Pay a ferryman (10 gold)",
            resolve: () => {
              if (player.gold >= 10) {
                player.spendGold(10);
                return { message: "The ferryman takes you across safely for 10 gold.", type: "info" };
              }
              // Can't afford — forced to wade with penalty
              const dmg = 1 + Math.floor(Math.random() * 2);
              if (player.takeDamage) player.takeDamage(dmg);
              return { message: `You can't afford the ferry. You wade across and take ${dmg} damage from the current!`, type: "warning" };
            }
          }
        ]
      },
      {
        name: "Lucky Find",
        description: "Something glints in the sunlight between the rocks...",
        terrain: ['Grass', 'Sand', 'Rock', 'Forest', 'Snow'],
        choices: [
          {
            text: () => es.statLabel('Investigate the glint', 0.6, player.bonusMagic, 'MAG'),
            resolve: () => {
              const successChance = es.statCheck(0.6, player.bonusMagic);
              const roll = Math.random();
              if (roll < successChance * 0.5) {
                const gold = 30 + Math.floor(Math.random() * 60);
                player.earnGold(gold);
                return { message: `A hidden cache! Found ${gold} gold!`, type: "success" };
              } else if (roll < successChance) {
                const items = Object.keys(ItemLibrary);
                const item = items[Math.floor(Math.random() * items.length)];
                player.addItem({ name: item, quantity: 2 });
                return { message: `Found 2x ${item}!`, type: "success" };
              }
              // Failed investigation — small chance of harm
              if (Math.random() < 0.35) {
                const lost = Math.min(player.gold, 5 + Math.floor(Math.random() * 10));
                if (lost > 0) {
                  player.spendGold(lost);
                  return { message: `Something stung you! Lost ${lost} gold on antidotes.`, type: "error" };
                }
              }
              return { message: "Just a shiny rock. Oh well.", type: "info" };
            }
          },
          {
            text: "Keep walking",
            resolve: () => {
              return { message: "Probably nothing. You continue your journey.", type: "info" };
            }
          }
        ]
      },
      {
        name: "Caravan Wreckage",
        description: "A destroyed merchant caravan lies on the road. Goods are scattered everywhere.",
        terrain: ['Grass', 'Sand', 'Rock', 'Forest'],
        choices: [
          {
            text: () => es.statLabel('Scavenge supplies', 0.65, player.bonusAttack, 'ATK'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.65, player.bonusAttack)) {
                const items = Object.keys(ItemLibrary);
                const numItems = 2 + Math.floor(Math.random() * 3);
                const found = [];
                for (let i = 0; i < numItems; i++) {
                  const item = items[Math.floor(Math.random() * items.length)];
                  player.addItem({ name: item, quantity: 1 });
                  found.push(item);
                }
                return { message: `Scavenged: ${found.join(', ')}`, type: "success" };
              }
              // Raiders were watching the wreck!
              const lost = Math.min(player.gold, 15 + Math.floor(Math.random() * 20));
              if (lost > 0) player.spendGold(lost);
              return { message: `Raiders were watching the wreck! Lost ${lost} gold fighting them off.`, type: "error" };
            }
          },
          {
            text: "Investigate the scene (raider intel)",
            resolve: () => {
              if (typeof raiderManager !== 'undefined' && raiderManager.raiders.length > 0) {
                const r = raiderManager.raiders[0];
                return {
                  message: `Tracks lead toward (${r.x}, ${r.y}). Raiders of strength ${r.strength} operate nearby.`,
                  type: "warning"
                };
              }
              return { message: "The tracks go cold. No useful intel.", type: "info" };
            }
          }
        ]
      },
      {
        name: "Sick Traveler",
        description: "A sick traveler begs for help by the roadside.",
        terrain: ['Grass', 'Forest', 'Sand', 'Rock', 'Snow'],
        choices: [
          {
            text: "Give them Herbs (if you have some)",
            resolve: () => {
              if (player.inventory.has('Herbs')) {
                player.removeItem({ name: 'Herbs' });
                const reward = 15 + Math.floor(Math.random() * 20);
                player.earnGold(reward);
                return { message: `The traveler thanks you and gives you ${reward} gold!`, type: "success" };
              }
              return { message: "You don't have any Herbs to give.", type: "warning" };
            }
          },
          {
            text: "Give them 20 gold for medicine",
            resolve: () => {
              if (player.gold >= 20) {
                player.spendGold(20);
                // Boost reputation at the nearest city
                if (typeof cities !== 'undefined' && cities.length > 0) {
                  let nearest = null, bestDist = Infinity;
                  for (const c of cities) {
                    const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                    if (d < bestDist) { bestDist = d; nearest = c; }
                  }
                  if (nearest && nearest.adjustReputation) nearest.adjustReputation(2);
                }
                return { message: "The traveler is grateful. Your reputation improves with the nearest city.", type: "info" };
              }
              return { message: "You can't afford to help right now.", type: "warning" };
            }
          },
          {
            text: () => es.statLabel('Comfort them with kind words', 0.5, player.bonusCharm, 'CHA'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.5, player.bonusCharm)) {
                if (typeof cities !== 'undefined' && cities.length > 0) {
                  let nearest = null, bestDist = Infinity;
                  for (const c of cities) {
                    const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                    if (d < bestDist) { bestDist = d; nearest = c; }
                  }
                  if (nearest && nearest.adjustReputation) nearest.adjustReputation(3);
                }
                return { message: "Your words lift their spirits. Word of your kindness spreads!", type: "success" };
              }
              return { message: "They're too sick to listen. You part ways uncomfortably.", type: "info" };
            }
          },
          {
            text: "Walk past",
            resolve: () => {
              return { message: "You avert your eyes and keep walking.", type: "info" };
            }
          }
        ]
      },
      {
        name: "Bandit Toll",
        description: "Armed bandits block the road and demand a toll!",
        terrain: ['Forest', 'Rock'],
        timeLimit: 12,
        worstChoice: 0,
        timeoutMessage: "The bandits lose patience and shake you down!",
        choices: [
          {
            text: "Pay the toll (30 gold)",
            resolve: () => {
              if (player.gold >= 30) {
                player.spendGold(30);
                return { message: "You pay 30 gold and the bandits let you pass.", type: "warning" };
              }
              return { message: "You don't have 30 gold! They let you go with a shove.", type: "error" };
            }
          },
          {
            text: "Fight them!",
            resolve: () => {
              // Trigger a combat encounter
              if (typeof combatSystem !== 'undefined') {
                const bandit = new Raider({ x: player.x, y: player.y, strength: 3, patrolPoints: [] });
                bandit.loot.gold = 30 + Math.floor(Math.random() * 20);
                combatSystem.startCombat(bandit);
                return { message: "You draw your weapon!", type: "warning" };
              }
              return { message: "You fight them off but take some bruises.", type: "warning" };
            }
          },
          {
            text: () => es.statLabel('Sneak past', 0.4, player.bonusDefense, 'DEF'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.4, player.bonusDefense)) {
                return { message: "You slip past unnoticed!", type: "success" };
              }
              // Caught, lose some gold
              const lost = Math.min(player.gold, 15);
              player.spendGold(lost);
              return { message: `Caught! They take ${lost} gold as 'punishment'.`, type: "error" };
            }
          }
        ]
      },
      {
        name: "Abandoned Library",
        description: "You discover the ruins of a small library. Most books are ruined by weather, but a few intact volumes catch your eye.",
        terrain: ['Grass', 'Forest', 'Rock', 'Sand'],
        minDay: 10,
        choices: [
          {
            text: "Search the shelves carefully",
            resolve: () => {
              const bookKeys = Object.keys(ItemLibrary).filter(k => ItemLibrary[k].tags?.has('book'));
              // Only offer books player doesn't own
              const available = bookKeys.filter(k => !player.inventory.has(k));
              if (available.length === 0) {
                const gold = 20 + Math.floor(Math.random() * 30);
                player.earnGold(gold);
                return { message: `You already own all the valuable books here. You sell some old pages for ${gold} gold.`, type: "info" };
              }
              const bookKey = available[Math.floor(Math.random() * available.length)];
              const book = ItemLibrary[bookKey];
              if (player.addItem({ name: bookKey, quantity: 1 })) {
                return { message: `Found "${book.name}"! A rare find among the ruins.`, type: "success" };
              }
              return { message: "Your cargo is too full to carry any books.", type: "warning" };
            }
          },
          {
            text: "Leave it alone (could be trapped)",
            resolve: () => {
              return { message: "Better safe than sorry. You leave the dusty ruins behind.", type: "info" };
            }
          }
        ]
      },
      {
        name: "Traveling Scholar",
        description: "A weary scholar rests by the road, surrounded by stacks of books. They offer to share knowledge — for a price or a favor.",
        terrain: ['Grass', 'Forest', 'Sand', 'Rock'],
        minDay: 15,
        choices: [
          {
            text: "Buy a book (half price!)",
            resolve: () => {
              const bookKeys = Object.keys(ItemLibrary).filter(k => ItemLibrary[k].tags?.has('book'));
              const available = bookKeys.filter(k => !player.inventory.has(k));
              if (available.length === 0) {
                return { message: "\"You already know everything I could teach you!\" the scholar laughs.", type: "info" };
              }
              const bookKey = available[Math.floor(Math.random() * available.length)];
              const book = ItemLibrary[bookKey];
              const halfPrice = Math.floor((book.goalPercent || 0.15) * (window._newGameGoldTarget || 5000) * 0.5);
              if (player.gold >= halfPrice) {
                if (!player.addItem({ name: bookKey, quantity: 1 })) {
                  return { message: "Your cargo is too full!", type: "warning" };
                }
                player.spendGold(halfPrice);
                return { message: `Bought "${book.name}" for ${halfPrice} gold — a scholar's discount!`, type: "success" };
              }
              return { message: `You need ${halfPrice} gold for "${book.name}". You can't afford it.`, type: "warning" };
            }
          },
          {
            text: "Trade 3 items for a book",
            resolve: () => {
              const nonBookItems = [...player.inventory.keys()].filter(k => !ItemLibrary[k]?.tags?.has('book'));
              if (nonBookItems.length < 3) {
                return { message: "\"You don't have enough goods to trade,\" the scholar sighs.", type: "warning" };
              }
              const bookKeys = Object.keys(ItemLibrary).filter(k => ItemLibrary[k].tags?.has('book'));
              const available = bookKeys.filter(k => !player.inventory.has(k));
              if (available.length === 0) {
                return { message: "\"You already own all my books!\" the scholar exclaims.", type: "info" };
              }
              // Remove 3 random non-book items
              for (let i = 0; i < 3; i++) {
                const idx = Math.floor(Math.random() * nonBookItems.length);
                player.removeItem({ name: nonBookItems[idx] });
                nonBookItems.splice(idx, 1);
              }
              const bookKey = available[Math.floor(Math.random() * available.length)];
              const book = ItemLibrary[bookKey];
              player.addItem({ name: bookKey, quantity: 1 }, true); // force add
              return { message: `Traded 3 items for "${book.name}"! Knowledge is priceless.`, type: "success" };
            }
          },
          {
            text: "Chat and move on",
            resolve: () => {
              return { message: "The scholar shares some gossip and you part ways.", type: "info" };
            }
          }
        ]
      },

      // ═══════════════════════════════
      //  WATER-ONLY EVENTS
      // ═══════════════════════════════
      {
        name: "Sea Monster",
        description: "A massive tentacle erupts from the waves! Something lurks beneath your vessel!",
        terrain: ['Water'],
        minDay: 5,
        timeLimit: 15,
        worstChoice: 0,
        timeoutMessage: "The creature wraps its tentacles around your hull — you're forced to fight!",
        choices: [
          {
            text: "Fight it off!",
            resolve: () => {
              if (typeof combatSystem !== 'undefined') {
                const monster = new Raider({
                  x: player.x, y: player.y,
                  strength: 4 + Math.floor(Math.random() * 3),
                  patrolPoints: [],
                  type: 'seaMonster',
                  isMonster: true,
                });
                monster.loot.gold = 40 + Math.floor(Math.random() * 60);
                combatSystem.startCombat(monster);
                return { message: "The beast erupts from the depths — fight for your life!", type: "warning" };
              }
              // Fallback if no boat (shouldn't happen on water, but just in case)
              const dmg = 15 + Math.floor(Math.random() * 20);
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              return { message: `The creature batters your hull! -${dmg} condition.`, type: "error" };
            }
          },
          {
            text: "Throw cargo overboard to distract it",
            resolve: () => {
              const items = [...player.inventory.keys()].filter(k => !ItemLibrary[k]?.tags?.has('book'));
              if (items.length > 0) {
                const sacrifice = items[Math.floor(Math.random() * items.length)];
                player.removeItem({ name: sacrifice });
                return { message: `You toss 1 ${sacrifice} into the water. The creature takes the bait and sinks below!`, type: "warning" };
              }
              return { message: "You have nothing to throw! The beast loses interest after rocking your boat.", type: "warning" };
            }
          },
          {
            text: "Cut anchor and flee!",
            resolve: () => {
              if (player.activeBoat) {
                player.activeBoat.applyDamage(5);
                return { message: `You speed away! Minor hull scrapes (-5 condition, now ${player.activeBoat.condition}%).`, type: "info" };
              }
              return { message: "You paddle frantically and escape!", type: "info" };
            }
          }
        ]
      },
      {
        name: "Flotsam & Jetsam",
        description: "Wooden crates and barrels bob in the water ahead — wreckage from a ship!",
        terrain: ['Water'],
        choices: [
          {
            text: () => es.statLabel('Haul in the salvage', 0.75, player.bonusAttack, 'ATK'),
            resolve: () => {
              const successChance = es.statCheck(0.75, player.bonusAttack);
              const roll = Math.random();
              if (roll < successChance * 0.53) {
                const gold = 20 + Math.floor(Math.random() * 40);
                player.earnGold(gold);
                return { message: `Waterlogged coin purses! Salvaged ${gold} gold.`, type: "success" };
              } else if (roll < successChance) {
                const tradeGoods = ['Salt', 'Spices', 'Silk', 'Wine', 'Fish'];
                const item = tradeGoods[Math.floor(Math.random() * tradeGoods.length)];
                const qty = 1 + Math.floor(Math.random() * 3);
                if (ItemLibrary[item]) {
                  player.addItem({ name: item, quantity: qty });
                  return { message: `Found ${qty}x ${item} in a sealed crate!`, type: "success" };
                }
                player.earnGold(25);
                return { message: "Found some soggy but usable supplies worth 25 gold.", type: "success" };
              }
              // Trap — hull damage from hidden rocks
              if (player.activeBoat) {
                player.activeBoat.applyDamage(10);
                return { message: `Hidden debris scraped your hull! -10 condition (${player.activeBoat.condition}%).`, type: "error" };
              }
              return { message: "Just waterlogged junk. Not worth the effort.", type: "info" };
            }
          },
          {
            text: "Sail around it (play it safe)",
            resolve: () => {
              return { message: "Better safe than sorry on the open sea. You navigate around.", type: "info" };
            }
          }
        ]
      },

      // ═══════════════════════════════
      //  SNOW-ONLY EVENT
      // ═══════════════════════════════
      {
        name: "Blizzard",
        description: "A howling blizzard descends without warning! Visibility drops to nothing and the cold bites deep.",
        terrain: ['Snow'],
        season: ['Winter', 'Fall'],
        timeLimit: 15,
        worstChoice: 1,
        timeoutMessage: "The blizzard engulfs you before you can prepare — you stumble forward blindly!",
        choices: [
          {
            text: "Dig in and build a snow shelter",
            resolve: () => {
              if (player.inventory.has('Wood')) {
                player.removeItem({ name: 'Wood' });
                return { message: "You use 1 Wood to build a sturdy shelter and ride out the storm safely.", type: "success" };
              }
              return { message: "Without wood for a fire, you huddle together and wait. Cold but alive.", type: "info" };
            }
          },
          {
            text: () => es.statLabel('Push through the blizzard', 0.55, Math.floor((player.bonusMaxHP || 0) / 3), 'HP'),
            resolve: () => {
              const successChance = es.statCheck(0.55, Math.floor((player.bonusMaxHP || 0) / 3));
              const roll = Math.random();
              if (roll < successChance) {
                return { message: "You trudge through the blizzard and emerge on the other side!", type: "success" };
              } else if (roll < successChance + (1 - successChance) * 0.5) {
                // Lose perishable goods to cold
                const perishables = [...player.inventory.entries()]
                  .filter(([k]) => ItemLibrary[k]?.perishable);
                if (perishables.length > 0) {
                  const [key] = perishables[Math.floor(Math.random() * perishables.length)];
                  player.removeItem({ name: key });
                  return { message: `The freezing cold ruined 1 ${key}!`, type: "error" };
                }
                const lost = Math.min(player.gold, 15);
                if (lost > 0) player.spendGold(lost);
                return { message: `Mild frostbite! Lost ${lost} gold on supplies.`, type: "warning" };
              } else {
                const lost = Math.min(player.gold, 25);
                if (lost > 0) player.spendGold(lost);
                return { message: `Frostbite! Lost ${lost} gold on medical supplies.`, type: "error" };
              }
            }
          },
          {
            text: "Burn cargo for warmth (sacrifice 2 items)",
            resolve: () => {
              const items = [...player.inventory.keys()].filter(k => !ItemLibrary[k]?.tags?.has('book'));
              if (items.length >= 2) {
                const a = items[Math.floor(Math.random() * items.length)];
                player.removeItem({ name: a });
                const remaining = items.filter(k => k !== a);
                const b = remaining[Math.floor(Math.random() * remaining.length)] || a;
                player.removeItem({ name: b });
                const gold = 10 + Math.floor(Math.random() * 15);
                player.earnGold(gold);
                return { message: `Burned 1 ${a} and 1 ${b} for warmth. Found ${gold} gold in the ashes of your camp.`, type: "warning" };
              }
              return { message: "You don't have enough cargo to burn. You shiver through the storm.", type: "warning" };
            }
          }
        ]
      },

      // ═══════════════════════════════
      //  SAND-ONLY EVENT
      // ═══════════════════════════════
      {
        name: "Quicksand",
        description: "The ground gives way beneath you! You're sinking into quicksand!",
        terrain: ['Sand'],
        timeLimit: 10,
        worstChoice: 2,
        timeoutMessage: "You're sinking fast — panic sets in as you thrash around!",
        choices: [
          {
            text: "Throw heavy cargo to lighten the load",
            resolve: () => {
              const heavyItems = [...player.inventory.keys()]
                .filter(k => ItemLibrary[k] && ItemLibrary[k].weight >= 2 && !ItemLibrary[k].tags?.has('book'));
              if (heavyItems.length > 0) {
                const item = heavyItems[Math.floor(Math.random() * heavyItems.length)];
                player.removeItem({ name: item });
                return { message: `You toss 1 ${item} and pull yourself free!`, type: "warning" };
              }
              // No heavy items, sacrifice gold
              const cost = Math.min(player.gold, 25);
              if (cost > 0) player.spendGold(cost);
              return { message: `You struggle free but drop ${cost} gold coins in the sand!`, type: "warning" };
            }
          },
          {
            text: "Use a rope (requires Tools)",
            resolve: () => {
              if (player.inventory.has('Tools')) {
                player.removeItem({ name: 'Tools' });
                return { message: "You use your Tools to rig a rope and pull yourself out. Tools consumed.", type: "success" };
              }
              return { message: "You don't have Tools! You flail and barely escape, losing some supplies.", type: "error" };
            }
          },
          {
            text: () => es.statLabel('Stay calm and slowly work your way out', 0.6, Math.floor((player.bonusMaxHP || 0) / 3), 'HP'),
            resolve: () => {
              const hpBonus = Math.floor((player.bonusMaxHP || 0) / 3);
              if (Math.random() < es.statCheck(0.6, hpBonus)) {
                return { message: "You stay calm, spread your weight, and slowly crawl free!", type: "success" };
              }
              // Sink deeper, lose more
              const items = [...player.inventory.keys()].filter(k => !ItemLibrary[k]?.tags?.has('book'));
              if (items.length > 0) {
                const lost = items[Math.floor(Math.random() * items.length)];
                player.removeItem({ name: lost });
                return { message: `You struggle too much and 1 ${lost} sinks into the sand before you escape!`, type: "error" };
              }
              const goldLost = Math.min(player.gold, 15);
              if (goldLost > 0) player.spendGold(goldLost);
              return { message: `You barely escape but ${goldLost} gold sinks into the sand!`, type: "error" };
            }
          }
        ]
      },

      // ═══════════════════════════════════════════════════════
      //  NEW ECONOMY/META EVENTS (integrate with new systems)
      // ═══════════════════════════════════════════════════════

      // --- Treasure Map Fragment ---
      {
        name: "Old Hermit's Gift",
        description: "An old hermit beckons you from a cave entrance. 'I've no use for this anymore,' he says, holding a tattered parchment.",
        terrain: ['Rock', 'Forest', 'Sand'],
        minDay: 8,
        choices: [
          {
            text: "Accept the parchment",
            resolve: () => {
              // Small chance the parchment is a trap
              if (Math.random() < 0.2) {
                const trapGold = Math.min(player.gold, 10);
                if (trapGold > 0) player.spendGold(trapGold);
                return { message: `It was a trick! A pickpocket snatches ${trapGold} gold while you're distracted!`, type: "error" };
              }
              if (typeof treasureSystem !== 'undefined') {
                const regions = ['northern', 'southern', 'eastern', 'western', 'central'];
                const region = regions[Math.floor(Math.random() * regions.length)];
                treasureSystem.addFragment(region);
                return { message: `Received a treasure map fragment (${region} region)! Collect 3 of the same region to form a map.`, type: "success" };
              }
              const gold = 25 + Math.floor(Math.random() * 30);
              player.earnGold(gold);
              return { message: `The parchment was worthless, but you found ${gold} gold in the cave!`, type: "info" };
            }
          },
          {
            text: "Decline politely",
            resolve: () => {
              return { message: "The hermit shrugs and retreats into his cave.", type: "info" };
            }
          }
        ]
      },

      // --- Smuggler Encounter ---
      {
        name: "Shady Dockworker",
        description: "A figure in a dark cloak sidles up to you. 'Psst... looking to make some real coin? I know where the black markets are.'",
        terrain: ['Grass', 'Sand', 'Forest'],
        minDay: 10,
        choices: [
          {
            text: "Pay 50 gold for information",
            resolve: () => {
              if (player.gold >= 50) {
                player.spendGold(50);
                if (typeof smugglingSystem !== 'undefined') {
                  smugglingSystem.knownMarkets = smugglingSystem.knownMarkets || [];
                  // Reveal a random city's black market
                  const eligible = (typeof cities !== 'undefined' ? cities : []).filter(c => c.hasBlackMarket && !smugglingSystem.knownMarkets.includes(c.name));
                  if (eligible.length > 0) {
                    const city = eligible[Math.floor(Math.random() * eligible.length)];
                    smugglingSystem.discoverMarket(city.name);
                    return { message: `The figure whispers: "${city.name} has a black market. Ask for 'the special goods'."`, type: "success" };
                  }
                }
                return { message: "The information leads to a dead end. 50 gold wasted.", type: "warning" };
              }
              return { message: "You can't afford the information. The figure melts into the shadows.", type: "warning" };
            }
          },
          {
            text: () => es.statLabel('Sweet-talk for free info', 0.4, player.bonusCharm, 'CHA'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.4, player.bonusCharm)) {
                if (typeof smugglingSystem !== 'undefined') {
                  smugglingSystem.knownMarkets = smugglingSystem.knownMarkets || [];
                  const eligible = (typeof cities !== 'undefined' ? cities : []).filter(c => c.hasBlackMarket && !smugglingSystem.knownMarkets.includes(c.name));
                  if (eligible.length > 0) {
                    const city = eligible[Math.floor(Math.random() * eligible.length)];
                    smugglingSystem.discoverMarket(city.name);
                    return { message: `Flattered, they whisper: "${city.name}'s black market is open to you now."`, type: "success" };
                  }
                }
                player.earnGold(25);
                return { message: "No new markets to reveal, but they tip you 25 gold for the pleasant chat.", type: "success" };
              }
              return { message: "They see through your charm. 'Pay up or scram.'", type: "info" };
            }
          },
          {
            text: "Decline — too risky",
            resolve: () => {
              return { message: "You walk away. Some opportunities aren't worth the risk.", type: "info" };
            }
          }
        ]
      },

      // --- Gambling Challenge ---
      {
        name: "Dice Game in the Woods",
        description: "A group of travelers has set up a dice game by a campfire. 'Care to try your luck, stranger?'",
        terrain: ['Grass', 'Forest', 'Sand'],
        choices: [
          {
            text: () => es.statLabel('Bet 30 gold on dice', 0.5, player.bonusCharm, 'CHA'),
            resolve: () => {
              if (player.gold < 30) return { message: "You don't have enough gold to play.", type: "warning" };
              player.spendGold(30);
              if (Math.random() < es.statCheck(0.50, player.bonusCharm)) {
                player.earnGold(60);
                return { message: "Lucky roll! You win 60 gold!", type: "success" };
              }
              return { message: "Bad luck! You lose 30 gold.", type: "error" };
            }
          },
          {
            text: () => es.statLabel('Bet 80 gold — high stakes', 0.4, player.bonusMagic, 'MAG'),
            resolve: () => {
              if (player.gold < 80) return { message: "Not enough gold for high stakes.", type: "warning" };
              player.spendGold(80);
              if (Math.random() < es.statCheck(0.40, player.bonusMagic)) {
                player.earnGold(160);
                return { message: "High roller! You pocket 160 gold!", type: "success" };
              }
              return { message: "The dice betray you. 80 gold gone.", type: "error" };
            }
          },
          {
            text: "Walk away",
            resolve: () => {
              return { message: "Gambling's a fool's game... right?", type: "info" };
            }
          }
        ]
      },

      // --- Cursed Item ---
      {
        name: "Mysterious Chest",
        description: "A beautifully ornate chest sits alone in the road. It glows faintly with an eerie light.",
        terrain: ['Grass', 'Forest', 'Rock', 'Sand'],
        minDay: 15,
        timeLimit: 15,
        worstChoice: 0,
        timeoutMessage: "Curiosity gets the better of you — you open the chest!",
        choices: [
          {
            text: () => es.statLabel('Open the chest', 0.55, player.bonusMagic, 'MAG'),
            resolve: () => {
              const successChance = es.statCheck(0.55, player.bonusMagic);
              const roll = Math.random();
              if (roll < successChance * 0.64) {
                // Great treasure!
                const gold = 50 + Math.floor(Math.random() * 70);
                player.earnGold(gold);
                return { message: `Jackpot! The chest held ${gold} gold!`, type: "success" };
              } else if (roll < successChance) {
                // Treasure item
                if (ItemLibrary['AncientCoin']) {
                  player.addItem({ name: 'AncientCoin', quantity: 1 }, true);
                  return { message: "An Ancient Coin glimmers inside! A valuable relic.", type: "success" };
                }
                player.earnGold(50);
                return { message: "Found 50 gold inside!", type: "success" };
              } else if (roll < successChance + (1 - successChance) * 0.45) {
                // Cursed!
                if (ItemLibrary['CursedAmulet']) {
                  player.addItem({ name: 'CursedAmulet', quantity: 1 }, true);
                  return { message: "A Cursed Amulet latches onto you! It drains 5 gold/day until you sell it!", type: "error" };
                }
                const lost = Math.min(player.gold, 30);
                if (lost > 0) player.spendGold(lost);
                return { message: `The chest was trapped! Lost ${lost} gold.`, type: "error" };
              } else {
                // Trap, gold loss
                const lost = Math.min(player.gold, 40);
                if (lost > 0) player.spendGold(lost);
                return { message: `TRAP! Poison gas erupts! You stumble away, losing ${lost} gold on antidotes.`, type: "error" };
              }
            }
          },
          {
            text: "Leave it alone",
            resolve: () => {
              return { message: "You've seen enough horror tales to know better. You walk away.", type: "info" };
            }
          }
        ]
      },

      // --- Haggling Encounter ---
      {
        name: "Stubborn Peddler",
        description: "A peddler blocks your path with a cart of overpriced goods. 'Everything must go!' they shout.",
        terrain: ['Grass', 'Sand', 'Forest', 'Rock'],
        choices: [
          {
            text: "Haggle for a deal (minigame)",
            resolve: () => {
              if (typeof minigameManager !== 'undefined') {
                minigameManager.launch('haggling', { basePrice: 100, reputation: player.currentCity?.reputation || 50 }, (result) => {
                  if (result && result.success) {
                    const gold = 20 + Math.floor((result.avgAccuracy || 0) * 20);
                    player.earnGold(gold);
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(`Haggled successfully! Earned ${gold} gold worth of deals!`, 'success');
                  } else {
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log('The peddler refuses to budge. No deal.', 'warning');
                  }
                  if (typeof gameStateManager !== 'undefined')
                    es._returnToGameState();
                });
                gameStateManager.setState(GameStates.MINIGAME);
                return { message: "Haggle time! Stop the bar in the green zone!", type: "info" };
              }
              // Fallback if no minigame system
              if (Math.random() < es.statCheck(0.5, player.bonusCharm)) {
                const gold = 20 + Math.floor(Math.random() * 20);
                player.earnGold(gold);
                return { message: `You talked them down and got ${gold} gold in goods!`, type: "success" };
              }
              return { message: "They won't budge on the price.", type: "info" };
            }
          },
          {
            text: "Buy at full price (40 gold for random goods)",
            resolve: () => {
              if (player.gold >= 40) {
                player.spendGold(40);
                const goods = ['Wine', 'Jewelry', 'Silk', 'Spices', 'Tools'];
                const item = goods[Math.floor(Math.random() * goods.length)];
                if (ItemLibrary[item]) {
                  player.addItem({ name: item, quantity: 2 });
                  return { message: `Bought 2x ${item} for 40 gold.`, type: "info" };
                }
                player.earnGold(40);
                return { message: "The goods were fake! You get your money back.", type: "warning" };
              }
              return { message: "Too expensive. You walk away empty handed.", type: "warning" };
            }
          },
          {
            text: "Walk around them",
            resolve: () => {
              return { message: "'FINE! SEE IF I CARE!' the peddler shouts as you leave.", type: "info" };
            }
          }
        ]
      },

      // --- Bank Robbery Aftermath ---
      {
        name: "Ransacked Village",
        description: "You come across a village that was recently raided. The bank vault lies open and empty.",
        terrain: ['Grass', 'Rock', 'Forest'],
        minDay: 20,
        choices: [
          {
            text: "Help the villagers (donate 50 gold)",
            resolve: () => {
              if (player.gold >= 50) {
                player.spendGold(50);
                // Boost reputation at all nearby cities
                if (typeof cities !== 'undefined') {
                  for (const c of cities) {
                    const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                    if (d <= 15 && c.adjustReputation) c.adjustReputation(5);
                  }
                }
                return { message: "Your generosity earns major reputation with nearby cities!", type: "success" };
              }
              return { message: "You wish you could help but can't afford it.", type: "warning" };
            }
          },
          {
            text: () => es.statLabel('Search the ruins for leftover loot', 0.4, player.bonusAttack, 'ATK'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.4, player.bonusAttack)) {
                const gold = 30 + Math.floor(Math.random() * 50);
                player.earnGold(gold);
                return { message: `Found ${gold} gold the raiders missed!`, type: "success" };
              }
              // Reputation hit if caught scavenging
              if (typeof cities !== 'undefined') {
                for (const c of cities) {
                  const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                  if (d <= 10 && c.adjustReputation) c.adjustReputation(-3);
                }
              }
              return { message: "Villagers catch you scavenging. Your reputation suffers.", type: "error" };
            }
          },
          {
            text: "Move on",
            resolve: () => {
              return { message: "You offer condolences and continue your journey.", type: "info" };
            }
          }
        ]
      },

      // --- Treasure Map Clue ---
      {
        name: "Treasure Map Peddler",
        description: "A weathered sailor waves a tattered map piece at you. 'Straight from the Dragon's Hoard, mate!'",
        terrain: ['Grass', 'Sand', 'Rock', 'Forest', 'Snow'],
        minDay: 12,
        choices: [
          {
            text: "Buy the fragment (35 gold)",
            resolve: () => {
              if (player.gold >= 35) {
                player.spendGold(35);
                if (typeof treasureSystem !== 'undefined') {
                  const regions = ['northern', 'southern', 'eastern', 'western', 'central'];
                  const region = regions[Math.floor(Math.random() * regions.length)];
                  treasureSystem.addFragment(region);
                  return { message: `Got a ${region} map fragment! Collect 3 of the same region.`, type: "success" };
                }
                player.earnGold(35);
                return { message: "The map was illegible. Money refunded.", type: "warning" };
              }
              return { message: "Not enough gold. The sailor sails away.", type: "warning" };
            }
          },
          {
            text: "Decline",
            resolve: () => {
              return { message: "'Your loss, landlubber!' the sailor grumbles.", type: "info" };
            }
          }
        ]
      },

      // --- Investment Opportunity ---
      {
        name: "Merchant Guild Offer",
        description: "A merchant guild representative approaches you. 'Invest in our trade route and earn dividends!'",
        terrain: ['Grass', 'Forest', 'Rock', 'Sand'],
        minDay: 15,
        choices: [
          {
            text: "Invest 100 gold (risky, 2-3× return in ~15 days)",
            resolve: () => {
              if (player.gold >= 100) {
                player.spendGold(100);
                if (typeof bankingSystem !== 'undefined' && typeof cities !== 'undefined' && cities.length > 0) {
                  const city = cities[Math.floor(Math.random() * cities.length)];
                  bankingSystem.invest(100, city.name);
                  return { message: `Invested 100g in ${city.name}'s trade route! Check the bank to track returns.`, type: "success" };
                }
                // Fallback: track return via day-based check
                if (typeof player !== 'undefined') {
                  player._pendingInvestment = {
                    amount: 100,
                    returnDay: (typeof dayNight !== 'undefined' ? dayNight.daysElapsed : 0) + 12 + Math.floor(Math.random() * 6),
                    returnGold: Math.floor(100 * (1.5 + Math.random() * 1.5)),
                  };
                }
                return { message: `Invested 100g. Returns will arrive eventually.`, type: "info" };
              }
              return { message: "You can't afford the minimum investment.", type: "warning" };
            }
          },
          {
            text: "Decline",
            resolve: () => {
              return { message: "'Your loss!' the representative huffs.", type: "info" };
            }
          }
        ]
      },

      // --- Smuggling Inspection ---
      {
        name: "Road Checkpoint",
        description: "City guards have set up a checkpoint. They're inspecting every traveler's cargo!",
        terrain: ['Grass', 'Rock', 'Sand'],
        timeLimit: 12,
        worstChoice: 0,
        timeoutMessage: "The guards grow suspicious of your hesitation!",
        choices: [
          {
            text: "Submit to inspection",
            resolve: () => {
              return resolveRoadInspection(50, 50);
            }
          },
          {
            text: "Bluff your way through (minigame)",
            resolve: () => {
              if (typeof minigameManager !== 'undefined') {
                minigameManager.launch('bluffMeter', { timeLimit: 10 }, (result) => {
                  if (result && result.success) {
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log('You bluffed your way past the guards!', 'success');
                  } else {
                    const outcome = resolveRoadInspection(30, 40);
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(`Bluff failed! ${outcome.message}`, 'error');
                  }
                  if (typeof gameStateManager !== 'undefined')
                    es._returnToGameState();
                });
                gameStateManager.setState(GameStates.MINIGAME);
                return { message: "Keep your heartbeat steady! Tap rhythm to stay calm.", type: "info" };
              }
              // Fallback
              if (Math.random() < es.statCheck(0.5, player.bonusCharm)) {
                return { message: "You act casual and walk through. Phew!", type: "success" };
              }
              const fine = Math.min(player.gold, 40);
              if (fine > 0) player.spendGold(fine);
              return { message: `Caught! Fined ${fine} gold.`, type: "error" };
            }
          },
          {
            text: "Bribe the guards (25 gold)",
            resolve: () => {
              if (player.gold >= 25) {
                player.spendGold(25);
                return { message: "The guard pockets your coin and waves you through. No questions asked.", type: "info" };
              }
              const outcome = resolveRoadInspection(50, 50);
              outcome.message = `You can't afford the bribe. ${outcome.message}`;
              outcome.type = outcome.type === 'success' ? 'warning' : outcome.type;
              return outcome;
            }
          }
        ]
      },

      // --- Bounty Intel ---
      {
        name: "Raider Camp Spotted",
        description: "You spot smoke from a raider encampment in the distance. Intel about their leader could be valuable.",
        terrain: ['Forest', 'Rock', 'Grass'],
        minDay: 10,
        choices: [
          {
            text: () => es.statLabel('Scout the camp (risky, intel reward)', 0.6, player.bonusAttack, 'ATK'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.6, player.bonusAttack)) {
                // Raider info
                if (typeof raiderManager !== 'undefined' && raiderManager.raiders.length > 0) {
                  const r = raiderManager.raiders[Math.floor(Math.random() * raiderManager.raiders.length)];
                  return { message: `Scout successful! Raider at (${r.x},${r.y}), strength ${r.strength}. Check bounty boards for gold!`, type: "success" };
                }
                player.earnGold(20);
                return { message: "Found 20 gold in an unattended stash!", type: "success" };
              }
              // Caught!
              const lost = Math.min(player.gold, 20);
              if (lost > 0) player.spendGold(lost);
              return { message: `Ambushed! Lost ${lost} gold escaping!`, type: "error" };
            }
          },
          {
            text: "Avoid the camp",
            resolve: () => {
              return { message: "You give the smoke a wide berth.", type: "info" };
            }
          }
        ]
      },

      // --- Navigation Dodge (sailing) ---
      {
        name: "Reef Maze",
        description: "Your vessel enters a treacherous reef-filled passage! Navigate carefully or risk hull damage!",
        terrain: ['Water'],
        minDay: 5,
        choices: [
          {
            text: "Navigate through (minigame)",
            resolve: () => {
              if (typeof minigameManager !== 'undefined') {
                minigameManager.launch('navigationDodge', {}, (result) => {
                  if (result && result.success) {
                    const gold = 30 + (result.dodged || 0);
                    player.earnGold(gold);
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(`Perfect navigation! Found ${gold} gold in a hidden cove!`, 'success');
                  } else {
                    if (player.activeBoat) {
                      player.activeBoat.applyDamage(20);
                      if (typeof notificationManager !== 'undefined')
                        notificationManager.log(`Crashed into a reef! -20 condition (${player.activeBoat.condition}%).`, 'error');
                    }
                  }
                  if (typeof gameStateManager !== 'undefined')
                    es._returnToGameState();
                });
                gameStateManager.setState(GameStates.MINIGAME);
                return { message: "Dodge the obstacles! Use arrow keys!", type: "info" };
              }
              // Fallback
              if (Math.random() < es.statCheck(0.5, player.bonusDefense)) {
                player.earnGold(30);
                return { message: "Navigated safely! Found 30 gold.", type: "success" };
              }
              if (player.activeBoat) player.activeBoat.applyDamage(15);
              return { message: "Scraped the hull on a reef!", type: "error" };
            }
          },
          {
            text: "Go around (slow but safe)",
            resolve: () => {
              return { message: "You take the long way around. Safe but costly in time.", type: "info" };
            }
          }
        ]
      },

      // --- Lockpicking Encounter ---
      {
        name: "Locked Strongbox",
        description: "You find a heavy iron strongbox chained to a sunken tree trunk. The lock is old but sturdy.",
        terrain: ['Forest', 'Rock', 'Grass'],
        minDay: 8,
        choices: [
          {
            text: "Pick the lock (minigame)",
            resolve: () => {
              if (typeof minigameManager !== 'undefined') {
                minigameManager.launch('lockpicking', { tumblers: 4, timeLimit: 20 }, (result) => {
                  if (result && result.success) {
                    const roll = Math.random();
                    let msg;
                    if (roll < 0.4) {
                      const gold = 60 + Math.floor(Math.random() * 80);
                      player.earnGold(gold);
                      msg = `The strongbox held ${gold} gold!`;
                    } else if (roll < 0.7 && ItemLibrary['EnchantedRing']) {
                      player.addItem({ name: 'EnchantedRing', quantity: 1 }, true);
                      msg = 'Found an Enchanted Ring inside!';
                    } else {
                      const gold = 40 + Math.floor(Math.random() * 30);
                      player.earnGold(gold);
                      msg = `Found ${gold} gold and some old documents.`;
                    }
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(msg, 'success');
                  } else {
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log('The lock jams! You can\'t open it.', 'warning');
                  }
                  if (typeof gameStateManager !== 'undefined')
                    es._returnToGameState();
                });
                gameStateManager.setState(GameStates.MINIGAME);
                return { message: "Rotate the tumblers to align! Use arrow keys.", type: "info" };
              }
              // Fallback
              if (Math.random() < es.statCheck(0.4, player.bonusMagic)) {
                const gold = 50 + Math.floor(Math.random() * 50);
                player.earnGold(gold);
                return { message: `Pried it open! Found ${gold} gold.`, type: "success" };
              }
              return { message: "The lock won't budge.", type: "warning" };
            }
          },
          {
            text: () => es.statLabel('Smash it open (brute force)', 0.5, player.bonusAttack, 'ATK'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.5, player.bonusAttack)) {
                const gold = 30 + Math.floor(Math.random() * 40);
                player.earnGold(gold);
                return { message: `Smashed it! Found ${gold} gold inside.`, type: "success" };
              }
              return { message: "The box is tougher than you thought. You hurt your hand.", type: "warning" };
            }
          },
          {
            text: "Leave it",
            resolve: () => {
              return { message: "You leave the mystery box behind.", type: "info" };
            }
          }
        ]
      },

      // --- Memory Challenge ---
      {
        name: "Curious Merchant's Game",
        description: "A bored merchant at a crossroads offers a deal: 'Match my cards and win a prize!'",
        terrain: ['Grass', 'Forest', 'Sand', 'Rock'],
        choices: [
          {
            text: "Play the memory game (entry: 20 gold)",
            resolve: () => {
              if (player.gold < 20) return { message: "You don't have 20 gold to play.", type: "warning" };
              player.spendGold(20);
              if (typeof minigameManager !== 'undefined') {
                minigameManager.launch('memoryMatch', { entryFee: 20 }, (result) => {
                  if (result && result.totalWon > 0) {
                    player.earnGold(result.totalWon);
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(`Good memory! Won ${result.totalWon} gold! (net: ${result.profit}g)`, result.profit >= 0 ? 'success' : 'warning');
                  } else {
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log('Too many mistakes! You lose your entry fee.', 'warning');
                  }
                  if (typeof gameStateManager !== 'undefined')
                    es._returnToGameState();
                });
                gameStateManager.setState(GameStates.MINIGAME);
                return { message: "Match all the pairs! Click to flip cards.", type: "info" };
              }
              // Fallback
              if (Math.random() < es.statCheck(0.5, player.bonusMagic)) {
                player.earnGold(60);
                return { message: "Won 60 gold!", type: "success" };
              }
              return { message: "Lost the game and your 20 gold entry.", type: "error" };
            }
          },
          {
            text: "Decline",
            resolve: () => {
              return { message: "'Suit yourself!' the merchant shrugs.", type: "info" };
            }
          }
        ]
      },

      // --- Contract Clue ---
      {
        name: "Town Crier",
        description: "A town crier announces bounties and contracts from nearby cities. 'Hear ye, hear ye!'",
        terrain: ['Grass', 'Forest', 'Rock', 'Sand'],
        minDay: 5,
        choices: [
          {
            text: "Listen for opportunities",
            resolve: () => {
              if (typeof cities !== 'undefined' && cities.length > 0) {
                const city = cities[Math.floor(Math.random() * cities.length)];
                const features = [];
                if (city.hasBountyBoard) features.push('a bounty board');
                if (city.hasBank) features.push('a bank');
                if (city.hasGamblingDen) features.push('a gambling den');
                if (features.length > 0) {
                  return { message: `"${city.name}" has ${features.join(', ')}! Visit to earn more gold.`, type: "info" };
                }
                return { message: `"${city.name}" is a quiet trading post. Good for basic commerce.`, type: "info" };
              }
              return { message: "The crier rambles on but says nothing useful.", type: "info" };
            }
          },
          {
            text: "Ignore and move on",
            resolve: () => {
              return { message: "You've heard enough town criers for one lifetime.", type: "info" };
            }
          }
        ]
      },

      // --- Pirate Ghost Ship (water only) ---
      {
        name: "Ghost Ship",
        description: "A spectral galleon appears through the fog, its tattered sails billowing in a wind you cannot feel.",
        terrain: ['Water'],
        minDay: 20,
        timeLimit: 12,
        worstChoice: 1,
        timeoutMessage: "The ghost ship passes through you! An icy chill steals your vitality!",
        choices: [
          {
            text: () => es.statLabel('Board the ghost ship (brave!)', 0.55, player.bonusAttack, 'ATK'),
            resolve: () => {
              const successChance = es.statCheck(0.55, player.bonusAttack);
              const roll = Math.random();
              if (roll < successChance * 0.64) {
                const gold = 60 + Math.floor(Math.random() * 80);
                player.earnGold(gold);
                if (ItemLibrary['GoldenIdol'] && Math.random() < 0.25) {
                  player.addItem({ name: 'GoldenIdol', quantity: 1 }, true);
                  return { message: `The spirits test your courage and reward you with ${gold} gold and a Golden Idol!`, type: "success" };
                }
                return { message: `Found ${gold} gold in the spectral hold!`, type: "success" };
              } else if (roll < successChance) {
                // Treasure fragment
                if (typeof treasureSystem !== 'undefined') {
                  const regions = ['northern', 'southern', 'eastern', 'western', 'central'];
                  treasureSystem.addFragment(regions[Math.floor(Math.random() * regions.length)]);
                  return { message: "A ghostly captain hands you a map fragment before fading away!", type: "success" };
                }
                player.earnGold(50);
                return { message: "Found 50 gold in the ghost ship!", type: "success" };
              } else {
                // Cursed
                if (ItemLibrary['CursedAmulet']) {
                  player.addItem({ name: 'CursedAmulet', quantity: 1 }, true);
                }
                const lost = Math.min(player.gold, 50);
                if (lost > 0) player.spendGold(lost);
                return { message: `The spirits are angry! Lost ${lost} gold and gained a cursed amulet!`, type: "error" };
              }
            }
          },
          {
            text: "Flee at full speed",
            resolve: () => {
              if (player.activeBoat) player.activeBoat.applyDamage(8);
              return { message: "You sail away at top speed. The ghost ship vanishes into the fog.", type: "warning" };
            }
          }
        ]
      },

      // --- Earthquake ---
      {
        name: "Earthquake",
        description: "The ground shakes violently! Rocks tumble from the hillside!",
        terrain: ['Rock', 'Grass', 'Forest'],
        timeLimit: 8,
        worstChoice: 1,
        timeoutMessage: "A rockslide catches you off guard!",
        choices: [
          {
            text: () => es.statLabel('Take cover behind a boulder', 0.75, player.bonusDefense, 'DEF'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.75, player.bonusDefense)) {
                return { message: "You duck behind a boulder and weather the quake safely!", type: "success" };
              }
              const lost = Math.min(player.gold, 15);
              if (lost > 0) player.spendGold(lost);
              return { message: `A rock clips you! Lost ${lost} gold on medical supplies.`, type: "warning" };
            }
          },
          {
            text: () => es.statLabel('Run for open ground', 0.5, Math.floor((player.bonusMaxHP || 0) / 3), 'HP'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.5, Math.floor((player.bonusMaxHP || 0) / 3))) {
                return { message: "You sprint to safety!", type: "success" };
              }
              const items = [...player.inventory.keys()].filter(k => !ItemLibrary[k]?.tags?.has('book'));
              if (items.length > 0) {
                const lost = items[Math.floor(Math.random() * items.length)];
                player.removeItem({ name: lost });
                return { message: `Dropped 1 ${lost} while running!`, type: "error" };
              }
              return { message: "You stumble but make it out with just bruises.", type: "warning" };
            }
          }
        ]
      },

      // ═══════════════════════════════
      //  ADDITIONAL WATER EVENTS
      // ═══════════════════════════════

      // --- Pirate Parley ---
      {
        name: "Pirate Parley",
        description: "A black-flagged ship pulls alongside and a grizzled captain shouts across the water: 'Pay the sea tax or we take everything!'",
        terrain: ['Water'],
        minDay: 5,
        timeLimit: 14,
        worstChoice: 0,
        timeoutMessage: "You dithered too long — the pirates grow impatient and open fire!",
        choices: [
          {
            text: () => {
              const tribute = Math.min(player.gold, Math.floor(player.gold * 0.15) + 20);
              return `Pay tribute (${tribute} gold)`;
            },
            resolve: () => {
              const tribute = Math.min(player.gold, Math.floor(player.gold * 0.15) + 20);
              player.spendGold(tribute);
              return { message: `You toss ${tribute} gold across the gap. The captain tips his hat and sails off.`, type: "warning" };
            }
          },
          {
            text: "Fight them off!",
            resolve: () => {
              if (typeof combatSystem !== 'undefined' && player.activeBoat && player.isSailing) {
                const pirate = new Raider({
                  x: player.x, y: player.y,
                  strength: 3 + Math.floor(Math.random() * 3),
                  patrolPoints: [],
                  isPirate: true,
                  boat: Math.random() < 0.5 ? 'sloop' : 'brigantine',
                });
                pirate.loot.gold = 40 + Math.floor(Math.random() * 60);
                combatSystem.startCombat(pirate);
                return { message: "You raise your colors and engage! Naval combat begins!", type: "warning" };
              }
              const dmg = 10 + Math.floor(Math.random() * 15);
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              return { message: `Exchanged cannon fire! Hull damaged (-${dmg} condition).`, type: "error" };
            }
          },
          {
            text: () => es.statLabel('Bluff — claim naval escort', 0.45, player.bonusCharm, 'CHA'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.45, player.bonusCharm)) {
                return { message: `"The Admiral's fleet is right behind me!" The pirates believe you and scatter.`, type: "success" };
              }
              const lost = Math.min(player.gold, 25 + Math.floor(Math.random() * 25));
              if (lost > 0) player.spendGold(lost);
              return { message: `They don't buy it. You negotiate a smaller tribute of ${lost} gold.`, type: "warning" };
            }
          }
        ]
      },

      // --- Distressed Merchant ---
      {
        name: "Distressed Merchant",
        description: "A listing merchant vessel fires distress flares — taking on water fast. The crew waves frantically from the deck!",
        terrain: ['Water'],
        choices: [
          {
            text: "Rescue the crew (good deed)",
            resolve: () => {
              const crewSaved = 3 + Math.floor(Math.random() * 5);
              if (typeof cities !== 'undefined') {
                let nearest = null, bestDist = Infinity;
                for (const c of cities) {
                  const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                  if (d < bestDist) { bestDist = d; nearest = c; }
                }
                if (nearest && nearest.adjustReputation) nearest.adjustReputation(6);
              }
              const reward = 30 + crewSaved * 10;
              player.earnGold(reward);
              return { message: `You haul ${crewSaved} sailors to safety. They press ${reward} gold into your hands in gratitude. Your reputation soars!`, type: "success" };
            }
          },
          {
            text: () => es.statLabel('Salvage the cargo before it sinks', 0.6, player.bonusAttack, 'ATK'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.6, player.bonusAttack)) {
                const tradeGoods = ['Silk', 'Spices', 'Wine', 'Jewelry', 'Salt'];
                const item = tradeGoods[Math.floor(Math.random() * tradeGoods.length)];
                const qty = 2 + Math.floor(Math.random() * 3);
                player.addItem({ name: item, quantity: qty });
                const goldAlso = 20 + Math.floor(Math.random() * 30);
                player.earnGold(goldAlso);
                return { message: `You grab what you can as it sinks — ${qty}x ${item} and ${goldAlso} gold!`, type: "success" };
              }
              // Reputation hit for abandoning crew
              if (typeof cities !== 'undefined') {
                for (const c of cities) {
                  const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                  if (d <= 20 && c.adjustReputation) c.adjustReputation(-4);
                }
              }
              return { message: "The ship goes down before you can grab anything. Witnesses spread ugly rumors about you.", type: "error" };
            }
          },
          {
            text: "Sail past — too dangerous",
            resolve: () => {
              return { message: "You harden your heart and steer clear. A sailor's life is full of cruel choices.", type: "info" };
            }
          }
        ]
      },

      // --- Fog Bank ---
      {
        name: "Fog Bank",
        description: "An impenetrable wall of fog rolls in from the horizon. Within minutes visibility drops to zero. You can't see your own bow.",
        terrain: ['Water'],
        timeLimit: 18,
        worstChoice: 2,
        timeoutMessage: "You panic and push forward blind — a grinding impact shudders through the hull!",
        choices: [
          {
            text: "Drop anchor and wait it out",
            resolve: () => {
              const hours = 2 + Math.floor(Math.random() * 4);
              return { message: `You anchor and wait ${hours} hours until the fog lifts. Time lost, but hull intact.`, type: "info" };
            }
          },
          {
            text: () => es.statLabel('Navigate by stars and instinct', 0.55, player.bonusMagic, 'MAG'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.55, player.bonusMagic)) {
                const gold = 20 + Math.floor(Math.random() * 30);
                player.earnGold(gold);
                return { message: "You emerge from the fog ahead of schedule and spot a hidden cove with abandoned supplies worth " + gold + " gold!", type: "success" };
              }
              const dmg = 8 + Math.floor(Math.random() * 12);
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              return { message: `You clip a submerged rock in the fog. Hull damage: -${dmg} condition.`, type: "error" };
            }
          },
          {
            text: "Ring the ship's bell and push slowly forward",
            resolve: () => {
              // Safe but slow — small hull nick chance
              if (Math.random() < 0.25) {
                const dmg = 5;
                if (player.activeBoat) player.activeBoat.applyDamage(dmg);
                return { message: `You inch forward carefully but still scrape something. -${dmg} hull condition.`, type: "warning" };
              }
              return { message: "You ring your bell and crawl forward. The fog slowly thins. No damage, just lost time.", type: "info" };
            }
          }
        ]
      },

      // --- Waterspout ---
      {
        name: "Waterspout",
        description: "A towering column of spinning water races toward your vessel! The roar is deafening and you have seconds to act.",
        terrain: ['Water'],
        season: ['Spring', 'Summer'],
        timeLimit: 10,
        worstChoice: 1,
        timeoutMessage: "The waterspout slams into your hull with terrifying force!",
        choices: [
          {
            text: () => es.statLabel('Race to outrun it', 0.6, player.bonusDefense, 'DEF'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.6, player.bonusDefense)) {
                return { message: "Full sail! You streak out of its path with bare seconds to spare!", type: "success" };
              }
              const dmg = 15 + Math.floor(Math.random() * 20);
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              return { message: `Not fast enough! The waterspout clips your stern — -${dmg} hull condition.`, type: "error" };
            }
          },
          {
            text: "Throw cargo overboard to lighten the ship",
            resolve: () => {
              const items = [...player.inventory.keys()].filter(k => !ItemLibrary[k]?.tags?.has('book'));
              const count = Math.min(2, items.length);
              if (count > 0) {
                for (let i = 0; i < count; i++) {
                  const idx = Math.floor(Math.random() * items.length);
                  player.removeItem({ name: items[idx] });
                  items.splice(idx, 1);
                }
                return { message: `You jettison ${count} item(s) to gain speed. The waterspout tears through where you were!`, type: "warning" };
              }
              // Nothing to throw — minor damage
              const dmg = 10;
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              return { message: `Nothing to sacrifice! You take a glancing blow. -${dmg} hull condition.`, type: "warning" };
            }
          },
          {
            text: "Lash everything down and ride it out",
            resolve: () => {
              // Guaranteed damage but predictable
              const dmg = 12 + Math.floor(Math.random() * 8);
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              const goldLost = Math.min(player.gold, 10 + Math.floor(Math.random() * 15));
              if (goldLost > 0) player.spendGold(goldLost);
              return { message: `You hunker down and take the hit — -${dmg} hull condition and ${goldLost} gold in broken equipment.`, type: "warning" };
            }
          }
        ]
      },

      // --- Message in a Bottle ---
      {
        name: "Message in a Bottle",
        description: "A green glass bottle bobs against your hull. Inside, a rolled parchment is sealed with red wax.",
        terrain: ['Water'],
        choices: [
          {
            text: "Open and read it",
            resolve: () => {
              const roll = Math.random();
              if (roll < 0.35) {
                // Treasure map fragment
                if (typeof treasureSystem !== 'undefined') {
                  const regions = ['northern', 'southern', 'eastern', 'western', 'central'];
                  const region = regions[Math.floor(Math.random() * regions.length)];
                  treasureSystem.addFragment(region);
                  return { message: `The parchment is a treasure map fragment (${region} region)! Someone went to great lengths to keep it safe.`, type: "success" };
                }
                const gold = 30 + Math.floor(Math.random() * 40);
                player.earnGold(gold);
                return { message: `A note describes a cache — you follow the crude directions and find ${gold} gold!`, type: "success" };
              } else if (roll < 0.60) {
                // Trade intelligence
                if (typeof cities !== 'undefined' && cities.length > 0) {
                  const city = cities[Math.floor(Math.random() * cities.length)];
                  const items = Object.keys(ItemLibrary);
                  const item = items[Math.floor(Math.random() * items.length)];
                  return { message: `"${item} prices will surge in ${city.name} within the fortnight — my dying gift to whoever finds this." — Captain R.`, type: "info" };
                }
                return { message: "The note is a desperate plea from a lost sailor. Moving, but not useful.", type: "info" };
              } else if (roll < 0.80) {
                // Reputation boost — deliver the note
                if (typeof cities !== 'undefined') {
                  let nearest = null, bestDist = Infinity;
                  for (const c of cities) {
                    const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                    if (d < bestDist) { bestDist = d; nearest = c; }
                  }
                  if (nearest && nearest.adjustReputation) nearest.adjustReputation(4);
                }
                return { message: "It's a will — you deliver it to the nearest port, earning heartfelt thanks and lasting reputation.", type: "success" };
              } else {
                // Ink smear / useless
                return { message: "The ink has run completely. Just a soggy blur. You toss it back.", type: "info" };
              }
            }
          },
          {
            text: "Ignore it",
            resolve: () => {
              return { message: "You leave the bottle to its endless voyage.", type: "info" };
            }
          }
        ]
      },

      // --- Royal Navy Inspection ---
      {
        name: "Royal Navy Patrol",
        description: "A warship flying the royal ensign pulls alongside and signals for you to heave to. 'Routine inspection. Do not resist.'",
        terrain: ['Water'],
        minDay: 8,
        timeLimit: 16,
        worstChoice: 2,
        timeoutMessage: "You hesitate too long — the navy interprets it as guilt and boards forcibly!",
        choices: [
          {
            text: "Submit to inspection",
            resolve: () => {
              const contraband = [...player.inventory.keys()].filter(k => ItemLibrary[k]?.tags?.has('contraband'));
              if (contraband.length > 0) {
                for (const c of contraband) {
                  const entry = player.inventory.get(c);
                  const qty = entry ? entry.quantity : 1;
                  for (let i = 0; i < qty; i++) player.removeItem({ name: c });
                }
                const fine = 80 + Math.floor(Math.random() * 80);
                const paid = Math.min(player.gold, fine);
                if (paid > 0) player.spendGold(paid);
                // Reputation hit at all cities
                if (typeof cities !== 'undefined') {
                  for (const c of cities) {
                    if (c.adjustReputation) c.adjustReputation(-8);
                  }
                }
                return { message: `Contraband seized! Fined ${paid} gold and your reputation takes a kingdom-wide hit. The navy does not forget.`, type: "error" };
              }
              // Clean — rep bonus
              if (typeof cities !== 'undefined') {
                for (const c of cities) {
                  const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                  if (d <= 25 && c.adjustReputation) c.adjustReputation(2);
                }
              }
              return { message: "All clear! The officer notes your cooperation. Nearby cities view you favourably.", type: "success" };
            }
          },
          {
            text: () => es.statLabel('Bribe the officer quietly', 0.5, player.bonusCharm, 'CHA'),
            resolve: () => {
              const bribeCost = Math.floor((window.DIFFICULTY_CONFIG?.bribeCostMultiplier || 1) * (40 + Math.floor(Math.random() * 30)));
              if (player.gold < bribeCost) return { message: `You can't afford the bribe (${bribeCost} gold). You submit to inspection.`, type: "warning" };
              if (Math.random() < es.statCheck(0.5, player.bonusCharm)) {
                player.spendGold(bribeCost);
                return { message: `The officer pockets ${bribeCost} gold and looks the other way. Efficient.`, type: "warning" };
              }
              player.spendGold(bribeCost);
              const extraFine = 40 + Math.floor(Math.random() * 40);
              const extraPaid = Math.min(player.gold, extraFine);
              if (extraPaid > 0) player.spendGold(extraPaid);
              return { message: `The officer is offended! Bribe rejected — you lose ${bribeCost + extraPaid} gold total and the contraband is seized!`, type: "error" };
            }
          },
          {
            text: () => es.statLabel('Make a run for it', 0.35, player.bonusDefense, 'DEF'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.35, player.bonusDefense)) {
                return { message: "You pull ahead in a risky sprint! The navy warship is too slow to follow. Lucky escape.", type: "success" };
              }
              const dmg = 25 + Math.floor(Math.random() * 20);
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              const goldLost = Math.min(player.gold, 60 + Math.floor(Math.random() * 60));
              if (goldLost > 0) player.spendGold(goldLost);
              if (typeof cities !== 'undefined') {
                for (const c of cities) {
                  if (c.adjustReputation) c.adjustReputation(-5);
                }
              }
              return { message: `A warning broadside hits home — -${dmg} hull condition and ${goldLost} gold in damages. Wanted in all ports!`, type: "error" };
            }
          }
        ]
      },

      // --- Stowaway ---
      {
        name: "Stowaway Discovered",
        description: "You find a terrified young person hiding in your cargo hold — a runaway, judging by the bruises and threadbare clothes.",
        terrain: ['Water'],
        choices: [
          {
            text: "Turn them in at the next port (bounty)",
            resolve: () => {
              const bountyGold = 25 + Math.floor(Math.random() * 40);
              player.earnGold(bountyGold);
              if (typeof cities !== 'undefined') {
                let nearest = null, bestDist = Infinity;
                for (const c of cities) {
                  const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                  if (d < bestDist) { bestDist = d; nearest = c; }
                }
                if (nearest && nearest.adjustReputation) nearest.adjustReputation(-3);
              }
              return { message: `You collect ${bountyGold} gold for the handover, but the stowaway's eyes haunt you. Reputation dips slightly.`, type: "warning" };
            }
          },
          {
            text: "Let them earn passage as a deckhand",
            resolve: () => {
              // They help with repairs
              if (player.activeBoat && player.activeBoat.condition < 100) {
                const repairAmt = Math.min(15, 100 - player.activeBoat.condition);
                player.activeBoat.condition = Math.min(100, player.activeBoat.condition + repairAmt);
                return { message: `The stowaway proves handy — they patch your hull (+${repairAmt} condition) and ask only for a meal.`, type: "success" };
              }
              const gold = 15 + Math.floor(Math.random() * 20);
              player.earnGold(gold);
              return { message: `The stowaway helps out and leaves a small purse of coins — all they had. ${gold} gold.`, type: "success" };
            }
          },
          {
            text: () => es.statLabel('Give them gold and drop them at the nearest shore', 0.5, player.bonusCharm, 'CHA'),
            resolve: () => {
              const cost = 20;
              if (player.gold < cost) return { message: "You can't spare any gold. They swim for shore anyway.", type: "warning" };
              player.spendGold(cost);
              if (typeof cities !== 'undefined') {
                let nearest = null, bestDist = Infinity;
                for (const c of cities) {
                  const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                  if (d < bestDist) { bestDist = d; nearest = c; }
                }
                if (nearest && nearest.adjustReputation) nearest.adjustReputation(3);
              }
              return { message: `You give them 20 gold and a kind word. They wave from the shore. The sea feels a little lighter.`, type: "success" };
            }
          }
        ]
      },

      // --- Rival Merchant Race ---
      {
        name: "Merchant's Wager",
        description: "A rival merchant pulls alongside, grinning ear to ear. 'Race you to the next port! First one in doubles their money — my purse says I'll beat that tub of yours!'",
        terrain: ['Water'],
        minDay: 3,
        choices: [
          {
            text: "Accept the wager (bet 50 gold) — minigame!",
            resolve: () => {
              if (player.gold < 50) return { message: "You can't cover the bet. The rival laughs and sails off.", type: "warning" };
              if (!player.activeBoat) return { message: "You need an active boat to race. The rival jeers and speeds away.", type: "warning" };
              player.spendGold(50);
              if (typeof minigameManager !== 'undefined') {
                const playerSpeedMs = player.activeBoat?.getEffectiveSpeed ? player.activeBoat.getEffectiveSpeed() : (player.activeBoat?.speed || 220);
                const playerCondition = player.activeBoat?.condition ?? 100;
                const rivalSpeedRating = 0.9 + Math.random() * 0.25;
                minigameManager.launch('shipRace', {
                  timeLimit: 20,
                  playerBoatName: player.activeBoat?.name || 'Your Ship',
                  playerSpeedMs,
                  playerCondition,
                  playerBonusSpeed: player.bonusSpeed || 0,
                  rivalSpeedRating,
                }, (result) => {
                  if (result && result.success) {
                    player.earnGold(100);
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(`You edged in first! 100 gold won! (${Math.round(result.playerProgress)}% vs ${Math.round(result.rivalProgress)}%)`, 'success');
                  } else {
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(`The rival's ship pulls ahead. 50 gold lost. (${Math.round(result?.playerProgress || 0)}% vs ${Math.round(result?.rivalProgress || 0)}%)`, 'error');
                  }
                  if (typeof gameStateManager !== 'undefined')
                    es._returnToGameState();
                });
                gameStateManager.setState(GameStates.MINIGAME);
                return { message: "Match your sails to the wind — keep up!", type: "info" };
              }
              // Fallback: coin flip
              if (Math.random() < 0.5) {
                player.earnGold(100);
                return { message: "Your crew pushes the sails to their limits and you edge in first! 100 gold won!", type: "success" };
              }
              return { message: "The rival's ship is sleeker. They pull away and arrive first. 50 gold lost.", type: "error" };
            }
          },
          {
            text: () => es.statLabel('Bet 100 gold — all out sprint', 0.45, player.bonusDefense, 'DEF'),
            resolve: () => {
              if (player.gold < 100) return { message: "Not enough gold for the high-stakes wager.", type: "warning" };
              player.spendGold(100);
              if (Math.random() < es.statCheck(0.45, player.bonusDefense)) {
                const dmg = 5 + Math.floor(Math.random() * 8);
                if (player.activeBoat) player.activeBoat.applyDamage(dmg);
                player.earnGold(200);
                return { message: `You push your vessel to the breaking point! Won 200 gold but pushed the hull a bit hard (-${dmg} condition).`, type: "success" };
              }
              const dmg = 10;
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              return { message: `Rigging snaps mid-race! You lose the bet and take -${dmg} hull damage limping in.`, type: "error" };
            }
          },
          {
            text: "Decline — it's probably rigged",
            resolve: () => {
              return { message: `"Coward!" the merchant shouts, sailing off. Smart money stays in your pocket.`, type: "info" };
            }
          }
        ]
      },

      // --- Whale Sighting ---
      {
        name: "Leviathan Sighting",
        description: "An enormous whale surfaces beside your vessel — easily as long as your ship. Its eye, the size of a wagon wheel, regards you with ancient intelligence.",
        terrain: ['Water'],
        choices: [
          {
            text: () => es.statLabel('Study it — write detailed notes', 0.6, player.bonusMagic, 'MAG'),
            resolve: () => {
              if (Math.random() < es.statCheck(0.6, player.bonusMagic)) {
                if (typeof cities !== 'undefined') {
                  let nearest = null, bestDist = Infinity;
                  for (const c of cities) {
                    const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                    if (d < bestDist) { bestDist = d; nearest = c; }
                  }
                  if (nearest && nearest.adjustReputation) nearest.adjustReputation(5);
                }
                const gold = 40 + Math.floor(Math.random() * 40);
                player.earnGold(gold);
                return { message: `You fill pages with careful sketches. A naturalist in the next port pays ${gold} gold for your notes and your reputation as a learned traveler grows.`, type: "success" };
              }
              return { message: "You sketch frantically but the creature dives before you get a good look. Incomplete notes.", type: "info" };
            }
          },
          {
            text: "Try to harpoon it for valuable oil",
            resolve: () => {
              if (Math.random() < 0.3) {
                player.addItem({ name: 'Oil', quantity: 3 });
                return { message: "Against the odds you land a hit! 3 Oil for your cargo, though your crew looks uneasy.", type: "success" };
              }
              // Enraged whale — hull damage
              const dmg = 20 + Math.floor(Math.random() * 20);
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              return { message: `The whale rolls and SLAPS your hull with a fin. -${dmg} condition. Next time, don't poke the giant.`, type: "error" };
            }
          },
          {
            text: "Drift in silence and observe",
            resolve: () => {
              // Small random bonus for peaceful approach
              if (Math.random() < 0.4) {
                if (typeof treasureSystem !== 'undefined') {
                  treasureSystem.addFragment('western');
                  return { message: "The whale nudges something loose from the seafloor — a waterlogged western map fragment floats to the surface!", type: "success" };
                }
                const gold = 20 + Math.floor(Math.random() * 20);
                player.earnGold(gold);
                return { message: `The whale exhales and dives, leaving calm water in its wake. You find something shiny in the froth — ${gold} gold.`, type: "success" };
              }
              return { message: "The whale regards you with one enormous eye, then sounds into the deep. You feel oddly humbled.", type: "info" };
            }
          }
        ]
      },

      // --- Sunken Shipwreck Dive ---
      {
        name: "Sunken Wreck Below",
        description: "The water here is crystal clear — you can make out the hull of a sunken galleon on the sandy bottom, maybe 10 fathoms down. Treasure glints in the shafts of light.",
        terrain: ['Water'],
        minDay: 10,
        choices: [
          {
            text: () => es.statLabel('Dive down and loot it', 0.5, player.bonusAttack, 'ATK'),
            resolve: () => {
              const successChance = es.statCheck(0.5, player.bonusAttack);
              const roll = Math.random();
              if (roll < successChance * 0.5) {
                const gold = 60 + Math.floor(Math.random() * 80);
                player.earnGold(gold);
                return { message: `You find the captain's strongbox almost intact! ${gold} gold salvaged.`, type: "success" };
              } else if (roll < successChance) {
                const items = ['Salt', 'Silk', 'Spices', 'Wine'];
                const item = items[Math.floor(Math.random() * items.length)];
                const qty = 2 + Math.floor(Math.random() * 3);
                player.addItem({ name: item, quantity: qty });
                return { message: `The hold still held sealed cargo — ${qty}x ${item} salvaged.`, type: "success" };
              }
              // Failed: took too long, hull damage from anchor
              const dmg = 5 + Math.floor(Math.random() * 10);
              if (player.activeBoat) player.activeBoat.applyDamage(dmg);
              return { message: `You surface empty-handed and exhausted. Your anchor fouled the rigging in the wreck — -${dmg} hull condition.`, type: "error" };
            }
          },
          {
            text: "Lower a weighted rope to drag up loose items",
            resolve: () => {
              if (Math.random() < 0.55) {
                const gold = 20 + Math.floor(Math.random() * 35);
                player.earnGold(gold);
                return { message: `The rope hooks a bag of coins — ${gold} gold dragged to the surface!`, type: "success" };
              }
              return { message: "You haul up nothing but barnacled timber and a very disappointed look.", type: "info" };
            }
          },
          {
            text: "Mark it on your charts and report it to a port",
            resolve: () => {
              if (typeof cities !== 'undefined') {
                let nearest = null, bestDist = Infinity;
                for (const c of cities) {
                  const d = Math.abs(player.x - c.location.x) + Math.abs(player.y - c.location.y);
                  if (d < bestDist) { bestDist = d; nearest = c; }
                }
                if (nearest && nearest.adjustReputation) nearest.adjustReputation(4);
              }
              const gold = 30 + Math.floor(Math.random() * 30);
              player.earnGold(gold);
              return { message: `Maritime authorities pay you a surveyor's fee of ${gold} gold and note your name favourably in the harbour records.`, type: "success" };
            }
          }
        ]
      },

      // --- Wheel of Fortune Event ---
      {
        name: "Fortune Teller's Wheel",
        description: "A fortune teller sits in a colorful tent, a large wheel of fortune spinning beside her. 'Spin and discover your fate!'",
        terrain: ['Grass', 'Forest', 'Sand'],
        choices: [
          {
            text: "Spin the wheel (costs 25 gold)",
            resolve: () => {
              if (player.gold < 25) return { message: "You can't afford a spin.", type: "warning" };
              player.spendGold(25);
              if (typeof minigameManager !== 'undefined') {
                minigameManager.launch('wheelOfFortune', { bet: 25 }, (result) => {
                  if (result && result.winnings > 0) {
                    player.earnGold(result.winnings);
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(`The wheel grants you ${result.winnings} gold!`, result.profit > 0 ? 'success' : 'info');
                  } else {
                    if (typeof notificationManager !== 'undefined')
                      notificationManager.log(`The wheel stops on ${result?.segment || 'nothing'}. Better luck next time!`, 'warning');
                  }
                  if (typeof gameStateManager !== 'undefined')
                    es._returnToGameState();
                });
                gameStateManager.setState(GameStates.MINIGAME);
                return { message: "The wheel spins!", type: "info" };
              }
              // Fallback
              const outcomes = [0, 10, 25, 50, 100, 0, 15];
              const result = outcomes[Math.floor(Math.random() * outcomes.length)];
              if (result > 0) {
                player.earnGold(result);
                return { message: `The wheel stops on ${result} gold!`, type: "success" };
              }
              return { message: "Bad luck! The wheel stops on nothing.", type: "warning" };
            }
          },
          {
            text: "Decline the spin",
            resolve: () => {
              return { message: "'Your loss!' the fortune teller cackles.", type: "info" };
            }
          }
        ]
      },
    ];
  }

  toJSON() {
    return {
      tilesMoved: this.tilesMoved,
      eventHistory: this.eventHistory,
    };
  }

  static fromJSON(data) {
    const es = new EventSystem();
    es.tilesMoved = data.tilesMoved || 0;
    es.eventHistory = data.eventHistory || [];
    return es;
  }
}

(function exportEventSystem(root) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { EventSystem };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
