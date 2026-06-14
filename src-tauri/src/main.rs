// src-tauri/src/main.rs
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if system_optimizer_lib::system::battery::handle_cli_bclm_arg() {
        return;
    }
    system_optimizer_lib::run();
}