//
//  ShareViewController.swift
//  ShareExtension
//
//  Created by WanTing Huang on 2026/9/10.
//

import UIKit
import UniformTypeIdentifiers

/// 沒有畫面的分享入口:接住分享進來的網址/文字,寫進 App Group 共用的 UserDefaults,
/// 再喚醒主 App(用自訂 URL scheme),讓主 App 導到既有的「快速新增」頁處理後續。
class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        handleShare()
    }

    private func handleShare() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = item.attachments else {
            finish()
            return
        }

        let urlType = UTType.url.identifier
        let textType = UTType.plainText.identifier

        if let urlProvider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(urlType) }) {
            urlProvider.loadItem(forTypeIdentifier: urlType) { [weak self] data, _ in
                let url = (data as? URL)?.absoluteString ?? ""
                self?.savePendingShare(url: url, text: "")
                DispatchQueue.main.async { self?.openHostApp() }
            }
        } else if let textProvider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(textType) }) {
            textProvider.loadItem(forTypeIdentifier: textType) { [weak self] data, _ in
                let text = data as? String ?? ""
                self?.savePendingShare(url: "", text: text)
                DispatchQueue.main.async { self?.openHostApp() }
            }
        } else {
            finish()
        }
    }

    private func savePendingShare(url: String, text: String) {
        let defaults = UserDefaults(suiteName: "group.com.tiara.receipe")
        defaults?.set(url, forKey: "pendingShareUrl")
        defaults?.set(text, forKey: "pendingShareText")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingShareTimestamp")
    }

    private func openHostApp() {
        guard let wakeUrl = URL(string: "receipe://share") else {
            finish()
            return
        }
        extensionContext?.open(wakeUrl, completionHandler: { [weak self] _ in
            self?.finish()
        })
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
