const STORAGE_KEY = 'skypuff_save';

const DEFAULT_SAVE = {
    bestHeight: 0,
    totalStars: 0,
    tutorialCompleted: false,
    sfxEnabled: true,
    musicEnabled: true,
    selectedSkin: 'classic',
    unlockedSkins: ['classic'],
};

export class Storage {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULT_SAVE };
            
            const parsed = JSON.parse(raw);
            const validated = { ...DEFAULT_SAVE };
            
            if (typeof parsed.bestHeight === 'number' && parsed.bestHeight >= 0) {
                validated.bestHeight = parsed.bestHeight;
            }
            if (typeof parsed.totalStars === 'number' && parsed.totalStars >= 0) {
                validated.totalStars = parsed.totalStars;
            }
            if (typeof parsed.tutorialCompleted === 'boolean') {
                validated.tutorialCompleted = parsed.tutorialCompleted;
            }
            if (typeof parsed.sfxEnabled === 'boolean') {
                validated.sfxEnabled = parsed.sfxEnabled;
            }
            if (typeof parsed.musicEnabled === 'boolean') {
                validated.musicEnabled = parsed.musicEnabled;
            }
            if (typeof parsed.selectedSkin === 'string') {
                validated.selectedSkin = parsed.selectedSkin;
            }
            if (Array.isArray(parsed.unlockedSkins)) {
                validated.unlockedSkins = parsed.unlockedSkins.filter(s => typeof s === 'string');
                if (!validated.unlockedSkins.includes('classic')) {
                    validated.unlockedSkins.push('classic');
                }
            }
            
            return validated;
        } catch (e) {
            console.warn('Failed to load save data, using defaults:', e);
            return { ...DEFAULT_SAVE };
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save data:', e);
        }
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
        this.save();
    }
}
