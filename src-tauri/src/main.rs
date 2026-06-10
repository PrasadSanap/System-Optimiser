// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if system_optimizer_lib::system::battery::handle_cli_bclm_arg() {
        return;
    }
    system_optimizer_lib::run();
}