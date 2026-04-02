import * as vscode from 'vscode';

const COMMAND_START_TRACKING = 'extension.startTracking';

export function activate(context: vscode.ExtensionContext): void {
  void vscode.window.showInformationMessage('Emotion Tracker Activated 🚀');

  let totalKeystrokes = 0;
  let backspaceCount = 0;

  // 🔥 Recent activity (for real-time emotion)
  let recentKeystrokes = 0;
  let recentBackspaces = 0;

  // ⏱ UX Timing
  const SOFT_IDLE_MS = 10 * 1000; // 10 sec
  const PAUSE_AFTER_MS = 1 * 60 * 1000; // 1 min
  const PAUSE_CHECK_MS = 500;

  const STUCK_NOTIFICATION_COOLDOWN_MS = 15_000;
  const FRUSTRATION_COOLDOWN = 15_000;

  let lastTypedTime = Date.now();
  let isPaused = false;
  let lastStuckNotificationAt = 0;
  let lastFrustrationAlert = 0;
  let lastMood = '';
  let hasTypedSinceActivate = false;

  // 📊 Output
  const statsChannel = vscode.window.createOutputChannel('Emotion Tracker');

  // 📍 Status bar
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.show();

  // 🔁 Reset recent behavior every 30 sec
  setInterval(() => {
    recentKeystrokes = 0;
    recentBackspaces = 0;
  }, 30000);

  // 🧠 Vibe Score
  const calculateVibeScore = (): number => {
    let score = 100;

    if (recentBackspaces > 10) {
      score -= recentBackspaces * 2;
    }

    if (recentKeystrokes < 20) {
      score -= 20;
    }

    if (isPaused) {
      score -= 25;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getMood = (score: number): string => {
    if (score > 70) return 'Confident 🔥';
    if (score >= 40) return 'Neutral 😐';
    return 'Frustrated 😓';
  };

  const getActivityLabel = (idleMs: number): string => {
    if (idleMs >= PAUSE_AFTER_MS) return 'Idle 💤';
    if (idleMs >= SOFT_IDLE_MS) return 'Thinking 🤔';
    return 'Active ⚡';
  };

  // 📊 Logging
  const logTypingStats = (): void => {
    const line = `[Emotion Tracker] totalKeystrokes=${totalKeystrokes} backspaces=${backspaceCount}`;
    console.log(line);
    statsChannel.appendLine(line);
  };

  // ⌨️ Typing active
  const markTypingActive = (): void => {
    lastTypedTime = Date.now();
    hasTypedSinceActivate = true;
    isPaused = false;
  };

  // 🔔 Idle notification (with buttons)
  const maybeNotifyStuckOnce = (now: number): void => {
    if (!hasTypedSinceActivate) return;
    if (now - lastStuckNotificationAt < STUCK_NOTIFICATION_COOLDOWN_MS) return;

    lastStuckNotificationAt = now;

    vscode.window
      .showInformationMessage(
        'You’ve been idle for a while. Want to take a break or continue? 😓',
        'Take Break 🧘',
        'Keep Coding 💻'
      )
      .then((selection) => {
        if (selection === 'Take Break 🧘') {
          vscode.window.showInformationMessage(
            'Good choice! Stretch, hydrate, and come back stronger 💪'
          );
        }
      });
  };

  // 🧠 Main UI updater
  const refreshStatusBar = (): void => {
    const idleMs = Date.now() - lastTypedTime;
    const activity = getActivityLabel(idleMs);
    const score = calculateVibeScore();
    const mood = getMood(score);

    statusBar.text = `${mood} | ${activity} | ${score}`;

    // 🔥 Frustration detection (smart)
    const now = Date.now();
    if (
      mood === 'Frustrated 😓' &&
      lastMood !== mood &&
      now - lastFrustrationAlert > FRUSTRATION_COOLDOWN
    ) {
      lastFrustrationAlert = now;

      vscode.window.showInformationMessage(
        'You seem frustrated. Try simplifying the problem 😓',
        'OK'
      );
    }

    lastMood = mood;
  };

  // 🧠 Pause detection
  const checkPauseState = (): void => {
    const now = Date.now();
    const idleMs = now - lastTypedTime;

    if (idleMs >= PAUSE_AFTER_MS) {
      if (!isPaused) {
        isPaused = true;
        maybeNotifyStuckOnce(now);
      }
    } else {
      isPaused = false;
    }

    refreshStatusBar();
  };

  // ⌨️ Typing tracker
  const onTextChange = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.contentChanges.length === 0) return;

    markTypingActive();

    for (const change of event.contentChanges) {
      totalKeystrokes += change.text.length;
      backspaceCount += change.rangeLength;

      recentKeystrokes += change.text.length;
      recentBackspaces += change.rangeLength;
    }
  });

  // ⏱ Intervals
  logTypingStats();
  const logInterval = setInterval(logTypingStats, 3000);
  const pauseCheckInterval = setInterval(checkPauseState, PAUSE_CHECK_MS);

  // ▶️ Command
  const startTracking = vscode.commands.registerCommand(
    COMMAND_START_TRACKING,
    () => {
      void vscode.window.showInformationMessage('Emotion tracking is running.');
    }
  );

  // 🧹 Cleanup
  context.subscriptions.push(
    onTextChange,
    statsChannel,
    statusBar,
    new vscode.Disposable(() => {
      clearInterval(logInterval);
      clearInterval(pauseCheckInterval);
    }),
    startTracking
  );
}

export function deactivate(): void {}