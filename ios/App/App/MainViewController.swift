//
//  MainViewController.swift
//  App
//
//  Created by WanTing Huang on 2026/9/10.
//

import Capacitor

/// Capacitor 只會自動掃描以獨立 plugin framework 形式載入的 plugin(例如透過 npm 安裝、cap sync 產生的那些)。
/// 直接寫在 App target 裡的 plugin(例如 SharedContentPlugin)沒有被自動掃描到,要在這裡手動註冊。
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SharedContentPlugin())
    }
}
