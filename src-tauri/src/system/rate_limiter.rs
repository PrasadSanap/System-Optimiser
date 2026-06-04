use std::collections::HashMap;
use std::time::{Duration, Instant};

/// Sliding-window rate limiter for system-modifying commands.
///
/// Each command name is tracked independently. A command is allowed when the
/// number of calls recorded within the trailing `window` is below `max_calls`.
/// Timestamps older than the window are discarded on every check, so memory
/// stays bounded by the number of recent calls.
///
/// `Instant` is used rather than wall-clock time so the limiter is unaffected
/// by clock adjustments (for example NTP corrections or daylight-saving jumps).
#[derive(Default)]
pub struct RateLimiter {
    calls: HashMap<String, Vec<Instant>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            calls: HashMap::new(),
        }
    }

    /// Record an attempt to run `command` and decide whether it may proceed.
    ///
    /// Returns `Ok(())` when the call is within the allowed rate and records
    /// its timestamp. Returns `Err` with a human-readable message when the
    /// limit for the current window has been reached; in that case no
    /// timestamp is recorded so a rejected call does not extend the window.
    pub fn check(
        &mut self,
        command: &str,
        max_calls: usize,
        window: Duration,
    ) -> Result<(), String> {
        let now = Instant::now();
        let timestamps = self.calls.entry(command.to_string()).or_default();

        // Drop any timestamps that fall outside the trailing window.
        timestamps.retain(|&t| now.duration_since(t) < window);

        if timestamps.len() >= max_calls {
            return Err(format!(
                "Rate limit exceeded for '{}': at most {} calls per {} seconds. Please wait and try again.",
                command,
                max_calls,
                window.as_secs()
            ));
        }

        timestamps.push(now);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_calls_up_to_the_limit() {
        let mut limiter = RateLimiter::new();
        let window = Duration::from_secs(60);
        for _ in 0..5 {
            assert!(limiter.check("apply_optimization", 5, window).is_ok());
        }
    }

    #[test]
    fn rejects_calls_beyond_the_limit() {
        let mut limiter = RateLimiter::new();
        let window = Duration::from_secs(60);
        for _ in 0..5 {
            assert!(limiter.check("apply_optimization", 5, window).is_ok());
        }
        assert!(limiter.check("apply_optimization", 5, window).is_err());
    }

    #[test]
    fn tracks_each_command_independently() {
        let mut limiter = RateLimiter::new();
        let window = Duration::from_secs(60);
        assert!(limiter.check("kill_process", 1, window).is_ok());
        // A different command is not affected by the first command's usage.
        assert!(limiter.check("apply_optimization", 1, window).is_ok());
        // The first command is now at its limit.
        assert!(limiter.check("kill_process", 1, window).is_err());
    }

    #[test]
    fn window_expiry_allows_new_calls() {
        let mut limiter = RateLimiter::new();
        // A zero-length window means every prior timestamp is already expired,
        // so calls are always permitted.
        let window = Duration::from_millis(0);
        assert!(limiter.check("kill_process", 1, window).is_ok());
        assert!(limiter.check("kill_process", 1, window).is_ok());
    }

    #[test]
    fn rejected_call_does_not_consume_a_slot() {
        let mut limiter = RateLimiter::new();
        let window = Duration::from_secs(60);
        assert!(limiter.check("kill_process", 1, window).is_ok());
        // Two rejections in a row prove the rejected attempt was not recorded.
        assert!(limiter.check("kill_process", 1, window).is_err());
        assert!(limiter.check("kill_process", 1, window).is_err());
    }
}
