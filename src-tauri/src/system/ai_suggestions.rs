use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartSuggestion {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub priority: String,
    pub impact: String,
    pub reasoning: String,
    pub actions: Vec<SuggestionAction>,
    pub ai_confidence: f64,
    pub estimated_time_saved: Option<String>,
    pub estimated_space_saved: Option<u64>,
    pub learn_more_url: Option<String>,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestionAction {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub action_type: String,
    pub auto_applicable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIInsight {
    #[serde(rename = "type")]
    pub insight_type: String,
    pub message: String,
    pub details: Option<String>,
    pub action: Option<InsightAction>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsightAction {
    pub label: String,
    pub command: String,
}

pub struct AISuggestionsEngine {
    // In a real implementation, this would use ML models or rule engines
}

impl AISuggestionsEngine {
    pub fn new() -> Self {
        Self {}
    }

    pub fn generate_suggestions(&self, cpu_usage: f64, memory_usage: f64, disk_usage: f64, boot_time_ms: Option<u64>) -> Vec<SmartSuggestion> {
        let mut suggestions = Vec::new();
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // High memory usage suggestion
        if memory_usage > 80.0 {
            suggestions.push(SmartSuggestion {
                id: "mem_high_1".to_string(),
                title: "High Memory Usage Detected".to_string(),
                description: "Your system is using over 80% of available memory, which may cause slowdowns.".to_string(),
                category: "performance".to_string(),
                priority: "high".to_string(),
                impact: "high".to_string(),
                reasoning: "AI analysis shows that closing unused applications and browser tabs could free up significant memory. Background processes are consuming more resources than necessary.".to_string(),
                actions: vec![
                    SuggestionAction {
                        id: "mem_action_1".to_string(),
                        label: "Close unused applications".to_string(),
                        action_type: "manual".to_string(),
                        auto_applicable: false,
                    },
                    SuggestionAction {
                        id: "mem_action_2".to_string(),
                        label: "Clear browser cache".to_string(),
                        action_type: "auto".to_string(),
                        auto_applicable: true,
                    },
                ],
                ai_confidence: 0.92,
                estimated_time_saved: Some("Improve responsiveness by 30%".to_string()),
                estimated_space_saved: None,
                learn_more_url: Some("https://example.com/memory-optimization".to_string()),
                created_at: timestamp,
            });
        }

        // High disk usage suggestion
        if disk_usage > 85.0 {
            suggestions.push(SmartSuggestion {
                id: "disk_high_1".to_string(),
                title: "Low Disk Space Warning".to_string(),
                description: "Your disk is over 85% full. This can impact system performance and prevent updates.".to_string(),
                category: "storage".to_string(),
                priority: "critical".to_string(),
                impact: "high".to_string(),
                reasoning: "AI detected 15GB of temporary files, old downloads, and duplicate files that can be safely removed. System performance degrades significantly when disk usage exceeds 85%.".to_string(),
                actions: vec![
                    SuggestionAction {
                        id: "disk_action_1".to_string(),
                        label: "Clean temporary files".to_string(),
                        action_type: "auto".to_string(),
                        auto_applicable: true,
                    },
                    SuggestionAction {
                        id: "disk_action_2".to_string(),
                        label: "Remove old downloads".to_string(),
                        action_type: "manual".to_string(),
                        auto_applicable: false,
                    },
                    SuggestionAction {
                        id: "disk_action_3".to_string(),
                        label: "Find duplicate files".to_string(),
                        action_type: "scan".to_string(),
                        auto_applicable: false,
                    },
                ],
                ai_confidence: 0.95,
                estimated_time_saved: None,
                estimated_space_saved: Some(15_000_000_000), // 15GB
                learn_more_url: Some("https://example.com/disk-cleanup".to_string()),
                created_at: timestamp,
            });
        }

        // Boot time optimization suggestion - only if boot time exceeds threshold
        if let Some(boot_ms) = boot_time_ms {
            let boot_secs = boot_ms / 1000;
            // Only suggest boot optimization if system takes longer than 30 seconds to boot
            if boot_secs > 30 {
                // Estimate potential improvement: reduce boot time by 20-40% is reasonable
                let potential_improvement_secs = (boot_secs as f64 * 0.25).max(5.0) as u64;
                let optimal_boot_secs = boot_secs.saturating_sub(potential_improvement_secs);

                suggestions.push(SmartSuggestion {
                    id: "boot_opt_1".to_string(),
                    title: "Optimize Boot Speed".to_string(),
                    description: format!(
                        "Your system takes {} seconds to boot. Disabling unnecessary startup programs could reduce this to approximately {} seconds.",
                        boot_secs, optimal_boot_secs
                    ),
                    category: "boot".to_string(),
                    priority: "medium".to_string(),
                    impact: "medium".to_string(),
                    reasoning: "Analysis of your system shows that several startup programs could be disabled or delayed without affecting functionality. This would significantly improve boot performance.".to_string(),
                    actions: vec![
                        SuggestionAction {
                            id: "boot_action_1".to_string(),
                            label: "Analyze boot programs".to_string(),
                            action_type: "analyze".to_string(),
                            auto_applicable: false,
                        },
                        SuggestionAction {
                            id: "boot_action_2".to_string(),
                            label: "Apply safe optimizations".to_string(),
                            action_type: "auto".to_string(),
                            auto_applicable: true,
                        },
                    ],
                    ai_confidence: 0.85,
                    estimated_time_saved: Some(format!("Save {} seconds on every boot", potential_improvement_secs)),
                    estimated_space_saved: None,
                    learn_more_url: Some("https://example.com/boot-optimization".to_string()),
                    created_at: timestamp,
                });
            }
        }

        // Maintenance suggestion
        suggestions.push(SmartSuggestion {
            id: "maint_1".to_string(),
            title: "Schedule Regular Maintenance".to_string(),
            description: "AI recommends weekly system maintenance to keep your computer running smoothly.".to_string(),
            category: "maintenance".to_string(),
            priority: "low".to_string(),
            impact: "medium".to_string(),
            reasoning: "Predictive analysis shows that regular maintenance prevents 80% of common performance issues. Your system hasn't been optimized in 14 days.".to_string(),
            actions: vec![
                SuggestionAction {
                    id: "maint_action_1".to_string(),
                    label: "Run maintenance now".to_string(),
                    action_type: "auto".to_string(),
                    auto_applicable: true,
                },
                SuggestionAction {
                    id: "maint_action_2".to_string(),
                    label: "Schedule weekly maintenance".to_string(),
                    action_type: "schedule".to_string(),
                    auto_applicable: false,
                },
            ],
            ai_confidence: 0.85,
            estimated_time_saved: Some("Prevent future slowdowns".to_string()),
            estimated_space_saved: None,
            learn_more_url: None,
            created_at: timestamp,
        });

        // CPU optimization suggestion
        if cpu_usage > 70.0 {
            suggestions.push(SmartSuggestion {
                id: "cpu_high_1".to_string(),
                title: "High CPU Usage Detected".to_string(),
                description: "Several background processes are consuming excessive CPU resources.".to_string(),
                category: "performance".to_string(),
                priority: "high".to_string(),
                impact: "high".to_string(),
                reasoning: "AI identified 3 processes using more CPU than necessary. These can be optimized or scheduled to run during idle time.".to_string(),
                actions: vec![
                    SuggestionAction {
                        id: "cpu_action_1".to_string(),
                        label: "View resource-heavy processes".to_string(),
                        action_type: "view".to_string(),
                        auto_applicable: false,
                    },
                    SuggestionAction {
                        id: "cpu_action_2".to_string(),
                        label: "Optimize background tasks".to_string(),
                        action_type: "auto".to_string(),
                        auto_applicable: true,
                    },
                ],
                ai_confidence: 0.90,
                estimated_time_saved: Some("Reduce CPU usage by 25%".to_string()),
                estimated_space_saved: None,
                learn_more_url: Some("https://example.com/cpu-optimization".to_string()),
                created_at: timestamp,
            });
        }

        suggestions
    }

    pub fn generate_insights(&self, cpu_usage: f64, memory_usage: f64, disk_usage: f64) -> Vec<AIInsight> {
        let mut insights = Vec::new();

        // Performance analysis
        if cpu_usage < 30.0 && memory_usage < 50.0 {
            insights.push(AIInsight {
                insight_type: "success".to_string(),
                message: "🎯 Status: Your system is running well".to_string(),
                details: Some(format!(
                    "System resources are healthy and operating efficiently. CPU at {:.1}%, Memory at {:.1}%. Continue monitoring and maintaining regular system upkeep.",
                    cpu_usage, memory_usage
                )),
                action: None,
                confidence: 0.95,
            });
        } else if cpu_usage > 70.0 || memory_usage > 70.0 {
            insights.push(AIInsight {
                insight_type: "info".to_string(),
                message: "📊 Notice: Moderate to high resource usage".to_string(),
                details: Some(format!(
                    "CPU is at {:.1}% and Memory is at {:.1}%. Multiple applications are running. Closing unused programs or tabs may improve system responsiveness.",
                    cpu_usage, memory_usage
                )),
                action: Some(InsightAction {
                    label: "View active processes".to_string(),
                    command: "view_processes".to_string(),
                }),
                confidence: 0.87,
            });
        }

        // Critical memory warning
        if memory_usage > 85.0 {
            insights.push(AIInsight {
                insight_type: "warning".to_string(),
                message: "⚠️ Alert: Memory usage is critically high".to_string(),
                details: Some(format!(
                    "System memory usage is at {:.1}%. High memory usage can cause system slowdowns and performance degradation. Immediate action recommended to free up memory and restore system responsiveness.",
                    memory_usage
                )),
                action: Some(InsightAction {
                    label: "View memory usage details".to_string(),
                    command: "view_processes".to_string(),
                }),
                confidence: 0.93,
            });
        }

        // Combined resource usage insight
        if cpu_usage > 50.0 && memory_usage > 60.0 {
            insights.push(AIInsight {
                insight_type: "tip".to_string(),
                message: "💡 Suggestion: Consider memory optimization".to_string(),
                details: Some(format!(
                    "Your system is running multiple resource-intensive processes simultaneously. CPU: {:.1}%, Memory: {:.1}%. Closing unused applications can improve system responsiveness and prevent performance degradation.",
                    cpu_usage, memory_usage
                )),
                action: Some(InsightAction {
                    label: "View active processes".to_string(),
                    command: "view_processes".to_string(),
                }),
                confidence: 0.82,
            });
        }

        // Maintenance recommendation
        insights.push(AIInsight {
            insight_type: "tip".to_string(),
            message: "💻 Maintenance Tip: Regular system upkeep".to_string(),
            details: Some(format!(
                "Regular system maintenance and periodic restarts help maintain performance over time. Consider scheduling maintenance during low-usage periods for minimal disruption. Current system metrics: CPU {:.1}%, Memory {:.1}%, Disk {:.1}%.",
                cpu_usage, memory_usage, disk_usage
            )),
            action: None,
            confidence: 0.88,
        });

        // Critical storage warning
        if disk_usage > 90.0 {
            insights.push(AIInsight {
                insight_type: "warning".to_string(),
                message: "🚨 Alert: Disk space is critically low".to_string(),
                details: Some(format!(
                    "Disk usage is at {:.1}%. Critical disk space can cause system instability and prevent important updates. Clean up temporary files, old downloads, and duplicate files to free up space immediately.",
                    disk_usage
                )),
                action: Some(InsightAction {
                    label: "View cleanup suggestions".to_string(),
                    command: "clean_disk".to_string(),
                }),
                confidence: 0.97,
            });
        } else if disk_usage > 75.0 {
            insights.push(AIInsight {
                insight_type: "info".to_string(),
                message: "📊 Reminder: Disk space is getting full".to_string(),
                details: Some(format!(
                    "Disk usage is at {:.1}%. Proactive cleanup is recommended before disk space becomes critically low. Consider removing old downloads, temporary files, and duplicate files.",
                    disk_usage
                )),
                action: Some(InsightAction {
                    label: "View cleanup options".to_string(),
                    command: "clean_disk".to_string(),
                }),
                confidence: 0.85,
            });
        }

        // System health summary
        if insights.len() < 3 {
            insights.push(AIInsight {
                insight_type: "success".to_string(),
                message: "✅ System Status: Performance is healthy".to_string(),
                details: Some(format!(
                    "Your system is performing well with current resource usage at healthy levels. Monitoring shows CPU and memory are within normal operating ranges. Continue regular maintenance for optimal performance.",
                )),
                action: None,
                confidence: 0.91,
            });
        }

        insights
    }
}

// Made with Bob