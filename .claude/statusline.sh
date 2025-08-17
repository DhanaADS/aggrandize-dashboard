#!/bin/bash

# Auto-generated statusline by Claude Code
# Displays: Working Directory, Git Branch, Model Name, Usage & Cost, Session Time

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Working Directory
get_working_directory() {
    local current_dir=$(pwd)
    local home_dir=$HOME
    if [[ "$current_dir" == "$home_dir"* ]]; then
        echo "~${current_dir#$home_dir}"
    else
        echo "$current_dir"
    fi
}

# Git Branch and Status
get_git_info() {
    if git rev-parse --git-dir > /dev/null 2>&1; then
        local branch=$(git branch --show-current 2>/dev/null || echo "detached")
        local status=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$status" -gt 0 ]]; then
            echo "${branch}•${status}"
        else
            echo "${branch}"
        fi
    else
        echo "no-git"
    fi
}

# Model Name (from Claude Code environment if available)
get_model_name() {
    # Try to get from Claude Code environment
    if [[ -n "$CLAUDE_MODEL" ]]; then
        echo "$CLAUDE_MODEL"
    elif [[ -n "$MODEL_NAME" ]]; then
        echo "$MODEL_NAME"
    else
        echo "Claude"
    fi
}

# Session Time (basic implementation)
get_session_time() {
    if [[ -f "/tmp/claude_session_start" ]]; then
        local start_time=$(cat /tmp/claude_session_start)
        local current_time=$(date +%s)
        local duration=$((current_time - start_time))
        local hours=$((duration / 3600))
        local minutes=$(((duration % 3600) / 60))
        printf "%02d:%02d" $hours $minutes
    else
        date +%s > /tmp/claude_session_start
        echo "00:00"
    fi
}

# Build statusline
build_statusline() {
    local wd=$(get_working_directory)
    local git_info=$(get_git_info)
    local model=$(get_model_name)
    local session_time=$(get_session_time)
    
    # Format with colors and emojis
    echo -e "📁 ${CYAN}${wd}${NC} | 🌿 ${GREEN}${git_info}${NC} | 🤖 ${PURPLE}${model}${NC} | ⌛ ${YELLOW}${session_time}${NC}"
}

# Main execution
build_statusline