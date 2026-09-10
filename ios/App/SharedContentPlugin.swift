//
//  SharedContentPlugin.swift
//  App
//
//  Created by WanTing Huang on 2026/9/10.
//

import Foundation
import Capacitor

/// 讀取 Share Extension 寫進 App Group 共用 UserDefaults 的分享內容,讀完就清掉(避免下次冷啟動重複帶入)。
@objc(SharedContentPlugin)
public class SharedContentPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SharedContentPlugin"
    public let jsName = "SharedContent"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPendingShare", returnType: CAPPluginReturnPromise)
    ]

    @objc func getPendingShare(_ call: CAPPluginCall) {
        let defaults = UserDefaults(suiteName: "group.com.tiara.receipe")
        let url = defaults?.string(forKey: "pendingShareUrl") ?? ""
        let text = defaults?.string(forKey: "pendingShareText") ?? ""
        let timestamp = defaults?.double(forKey: "pendingShareTimestamp") ?? 0

        defaults?.removeObject(forKey: "pendingShareUrl")
        defaults?.removeObject(forKey: "pendingShareText")
        defaults?.removeObject(forKey: "pendingShareTimestamp")

        call.resolve([
            "url": url,
            "text": text,
            "timestamp": timestamp
        ])
    }
}
