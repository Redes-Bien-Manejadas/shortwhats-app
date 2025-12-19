// Client-side bot detection utilities
// These checks detect common signs of automated browsers

export interface BotSignals {
    isWebdriver: boolean;
    hasAutomationFlags: boolean;
    hasHeadlessSignals: boolean;
    hasSuspiciousPlugins: boolean;
    hasNoMouseMovement: boolean;
    score: number; // 0 = definitely bot, 1 = definitely human
}

/**
 * Detect common bot/automation signals in the browser
 * Returns a score from 0 (bot) to 1 (human)
 */
export function detectBotSignals(): BotSignals {
    if (typeof window === 'undefined') {
        return {
            isWebdriver: false,
            hasAutomationFlags: false,
            hasHeadlessSignals: false,
            hasSuspiciousPlugins: false,
            hasNoMouseMovement: true,
            score: 0
        };
    }

    const nav = navigator as any;
    const win = window as any;
    const doc = document as any;

    // Check for WebDriver (Selenium, Puppeteer, Playwright)
    const isWebdriver = !!(
        nav.webdriver ||
        win.navigator.webdriver ||
        win.__webdriver_script_fn ||
        win.__driver_evaluate ||
        win.__webdriver_evaluate ||
        win.__selenium_evaluate ||
        win.__fxdriver_evaluate ||
        win.__driver_unwrapped ||
        win.__webdriver_unwrapped ||
        win.__selenium_unwrapped ||
        win.__fxdriver_unwrapped ||
        win._Selenium_IDE_Recorder ||
        win._selenium ||
        win.calledSelenium ||
        win.$cdc_asdjflasutopfhvcZLmcfl_ ||
        win.$chrome_asyncScriptInfo ||
        doc.__webdriver_script_fn ||
        doc.__driver_evaluate ||
        doc.__webdriver_evaluate ||
        doc.__selenium_evaluate ||
        doc.__fxdriver_evaluate
    );

    // Check for automation flags
    const hasAutomationFlags = !!(
        win.domAutomation ||
        win.domAutomationController ||
        nav.plugins.length === 0 ||
        nav.languages.length === 0
    );

    // Check for headless browser signals
    const hasHeadlessSignals = !!(
        /HeadlessChrome/.test(nav.userAgent) ||
        /Headless/.test(nav.userAgent) ||
        nav.plugins.length === 0 ||
        !win.chrome ||
        (win.chrome && !win.chrome.runtime)
    );

    // Check for suspicious plugin configuration
    const hasSuspiciousPlugins =
        nav.plugins.length === 0 ||
        (nav.plugins.length === 1 && nav.plugins[0].name === 'Shockwave Flash');

    // We'll track mouse movement separately
    const hasNoMouseMovement = false; // Will be updated by mouse tracker

    // Calculate score (higher = more likely human)
    let score = 1.0;
    if (isWebdriver) score -= 0.5;
    if (hasAutomationFlags) score -= 0.2;
    if (hasHeadlessSignals) score -= 0.2;
    if (hasSuspiciousPlugins) score -= 0.1;
    score = Math.max(0, score);

    return {
        isWebdriver,
        hasAutomationFlags,
        hasHeadlessSignals,
        hasSuspiciousPlugins,
        hasNoMouseMovement,
        score
    };
}

/**
 * Quick check if browser shows obvious bot signals
 */
export function isLikelyBot(): boolean {
    const signals = detectBotSignals();
    return signals.isWebdriver || signals.score < 0.5;
}
