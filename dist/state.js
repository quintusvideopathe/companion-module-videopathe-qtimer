export function safeNumber(value, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
export function normalizeHexColor(value) {
    const input = String(value ?? '').trim();
    if (!input) {
        return '';
    }
    const hex = input.startsWith('#') ? input.slice(1) : input;
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        return '';
    }
    return `#${hex.toUpperCase()}`;
}
export function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function splitDurationParts(totalSeconds) {
    const normalized = Math.max(0, Math.floor(safeNumber(totalSeconds)));
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const seconds = normalized % 60;
    return {
        hours,
        minutes,
        seconds,
        hoursText: String(hours).padStart(2, '0'),
        minutesText: String(minutes).padStart(2, '0'),
        secondsText: String(seconds).padStart(2, '0'),
        ampm: '',
    };
}
export function parseClockParts(clockText) {
    const input = String(clockText ?? '').trim();
    const match = input.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
    if (!match) {
        return {
            hours: 0,
            minutes: 0,
            seconds: 0,
            hoursText: '--',
            minutesText: '--',
            secondsText: '--',
            ampm: '',
        };
    }
    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);
    const ampm = (match[4] ?? '').toUpperCase();
    return {
        hours,
        minutes,
        seconds,
        hoursText: String(hours).padStart(2, '0'),
        minutesText: String(minutes).padStart(2, '0'),
        secondsText: String(seconds).padStart(2, '0'),
        ampm,
    };
}
export function formatDuration(totalSeconds, forceHours = true) {
    const normalized = Math.max(0, Math.floor(safeNumber(totalSeconds)));
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const seconds = normalized % 60;
    if (!forceHours && hours === 0) {
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function resolveTimerBlinkThresholdSeconds(state) {
    const options = state?.timerDisplayOptions;
    if (!options) {
        return 0;
    }
    if (options.blinkThresholdMode === 'percent') {
        const duration = safeNumber(state?.duration);
        const percent = clampNumber(Math.round(safeNumber(options.blinkThresholdPercent)), 0, 100);
        return duration > 0 ? Math.round((duration * percent) / 100) : 0;
    }
    return Math.max(0, Math.round(safeNumber(options.blinkThresholdSeconds, safeNumber(options.blinkThreshold))));
}
function resolveTimerDisplayColor(state) {
    const defaultColor = normalizeHexColor(state?.displaySettings?.timer?.color) || '#FFFFFF';
    if (state?.displaySettings?.timer?.syncColorWithProgress !== true) {
        return defaultColor;
    }
    const duration = safeNumber(state?.duration);
    if (duration <= 0) {
        return defaultColor;
    }
    const remaining = safeNumber(state?.timeRemaining);
    const progress = (remaining / duration) * 100;
    const yellowThreshold = safeNumber(state?.displaySettings?.progressBar?.yellowThreshold, 30);
    const redThreshold = safeNumber(state?.displaySettings?.progressBar?.redThreshold, 10);
    if (progress > yellowThreshold)
        return '#22C55E';
    if (progress > redThreshold)
        return '#EAB308';
    return '#EF4444';
}
function resolveChronoDisplayColor(state) {
    const chronoSeconds = safeNumber(state?.chronoTime);
    const threshold2 = safeNumber(state?.chronoColorThresholds?.threshold2);
    const threshold1 = safeNumber(state?.chronoColorThresholds?.threshold1);
    const threshold2Color = normalizeHexColor(state?.chronoColorThresholds?.color2);
    const threshold1Color = normalizeHexColor(state?.chronoColorThresholds?.color1);
    const defaultColor = normalizeHexColor(state?.displaySettings?.chrono?.color) || '#FFFFFF';
    if (state?.chronoDisplayOptions?.colorThresholdsEnabled === true) {
        if (threshold2 > 0 && chronoSeconds >= threshold2 && threshold2Color) {
            return threshold2Color;
        }
        if (threshold1 > 0 && chronoSeconds >= threshold1 && threshold1Color) {
            return threshold1Color;
        }
    }
    return defaultColor;
}
function resolveAdditionalTimeDisplayColor(state) {
    return normalizeHexColor(state?.displaySettings?.additionalTime?.color) || '#FFFFFF';
}
function isTimerDisplayBlinkEnabled(state) {
    const remaining = safeNumber(state?.timeRemaining);
    const threshold = resolveTimerBlinkThresholdSeconds(state);
    return state?.timerDisplayOptions?.blinkOnEnd === true && remaining <= threshold && remaining >= 0;
}
function isChronoDisplayBlinkEnabled(state) {
    const threshold = safeNumber(state?.chronoDisplayOptions?.blinkThreshold);
    return state?.chronoDisplayOptions?.blinkOnEnd === true && safeNumber(state?.chronoTime) >= threshold;
}
export function inferDisplayTimeSource(state) {
    if (state?.additionalTimeRunning === true) {
        return 'additional';
    }
    return inferDisplayMode(state) === 'chrono' ? 'chrono' : 'timer';
}
export function getActiveDisplayTimeState(state) {
    const source = inferDisplayTimeSource(state);
    const timerShowHours = state?.timerDisplayOptions?.showHours !== false;
    const chronoShowHours = state?.chronoDisplayOptions?.showHours !== false;
    let seconds = safeNumber(state?.timeRemaining);
    let showHours = timerShowHours;
    let color = resolveTimerDisplayColor(state);
    let blinkEnabled = isTimerDisplayBlinkEnabled(state);
    let blinkVisible = !blinkEnabled || state?.timerBlinkState !== false;
    if (source === 'additional') {
        seconds = safeNumber(state?.additionalTimeValue);
        showHours = true;
        color = resolveAdditionalTimeDisplayColor(state);
        blinkEnabled = state?.displaySettings?.additionalTime?.blink === true && state.additionalTimeRunning === true;
        blinkVisible = !blinkEnabled || state?.timerBlinkState !== false;
    }
    else if (source === 'chrono') {
        seconds = safeNumber(state?.chronoTime);
        showHours = chronoShowHours;
        color = resolveChronoDisplayColor(state);
        blinkEnabled = isChronoDisplayBlinkEnabled(state);
        blinkVisible = !blinkEnabled || state?.chronoDisplayOptions?.blinkState !== false;
    }
    const parts = splitDurationParts(seconds);
    return {
        source,
        seconds,
        showHours,
        formatted: formatDuration(seconds, showHours),
        fullFormatted: formatDuration(seconds, true),
        parts,
        color,
        blinkEnabled,
        blinkVisible,
    };
}
export function inferDisplayMode(state) {
    if (!state?.displaySettings) {
        return 'unknown';
    }
    const displaySettings = state.displaySettings;
    if (displaySettings.testPattern?.visible)
        return 'mire';
    if (displaySettings.blackMode?.visible)
        return 'black';
    if (displaySettings.logoFull?.visible)
        return 'logo';
    if (displaySettings.chrono?.visible)
        return 'chrono';
    if (displaySettings.clock2?.visible)
        return 'clock';
    if (displaySettings.timer?.visible || displaySettings.progressBar?.visible || displaySettings.clock?.visible)
        return 'timer';
    return 'unknown';
}
export function getCurrentPlaylistSession(playlist) {
    if (!playlist?.sessions?.length) {
        return undefined;
    }
    const currentIndex = safeNumber(playlist.currentSessionIndex, -1);
    if (currentIndex >= 0 && currentIndex < playlist.sessions.length) {
        return playlist.sessions[currentIndex];
    }
    return playlist.sessions.find((session) => session.isCurrent);
}
export function countEnabledSessions(playlist) {
    return playlist?.sessions?.filter((session) => session.isEnabled !== false).length ?? 0;
}
export function compareNumbers(operator, left, right) {
    switch (operator) {
        case 'lt':
            return left < right;
        case 'lte':
            return left <= right;
        case 'eq':
            return left === right;
        case 'gte':
            return left >= right;
        case 'gt':
            return left > right;
        default:
            return false;
    }
}
export function compareStrings(matchType, actual, expected) {
    const normalizedActual = actual.trim().toLowerCase();
    const normalizedExpected = expected.trim().toLowerCase();
    if (!normalizedExpected) {
        return false;
    }
    if (matchType === 'contains') {
        return normalizedActual.includes(normalizedExpected);
    }
    return normalizedActual === normalizedExpected;
}
export function isTimerFinished(state) {
    if (!state) {
        return false;
    }
    return safeNumber(state.timeRemaining) <= 0 && state.additionalTimeRunning !== true;
}
//# sourceMappingURL=state.js.map