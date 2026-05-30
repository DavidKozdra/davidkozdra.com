export const STATE = {
  MENU: 'MENU',
  CH1_INTRO: 'CH1_INTRO',
  CH1_CRACK: 'CH1_CRACK',
  CH1_ROOM: 'CH1_ROOM',
  CH2_RUN: 'CH2_RUN',
  CH3_HIGHFIVE: 'CH3_HIGHFIVE',
};

export const SAVE_KEY = 'dka_progress_v1';

export function createDefaultSave() {
  return {
    unlocked: [1, 2, 3],
    completed: [],
    inventory: {
      string: false,
      money: false,
      computer: false,
    },
    tosAccepted: false,
  };
}