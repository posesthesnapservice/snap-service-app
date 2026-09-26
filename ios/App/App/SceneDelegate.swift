import UIKit
import Capacitor

/**
 * SecureBridgeViewController
 *
 * Implements hardware-level screenshot and screen recording blackout protection
 * using Apple's native UITextField secure canvas layer (`isSecureTextEntry = true`).
 *
 * When an iOS user takes a hardware screenshot (Power + Volume Up) or starts screen
 * recording (Control Center, AirPlay, QuickTime), the iOS compositor renders this
 * entire view hierarchy as pure solid pitch black (#000000) - exactly like Netflix,
 * banking applications, and Telegram secret chats.
 */
class SecureBridgeViewController: CAPBridgeViewController {
    private let secureField = UITextField()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupScreenProtection()
    }

    private func setupScreenProtection() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            // 1. Configure the secure text field container
            self.secureField.isSecureTextEntry = true
            self.secureField.isUserInteractionEnabled = false
            self.secureField.translatesAutoresizingMaskIntoConstraints = false
            self.view.addSubview(self.secureField)
            self.view.sendSubviewToBack(self.secureField)

            NSLayoutConstraint.activate([
                self.secureField.topAnchor.constraint(equalTo: self.view.topAnchor),
                self.secureField.bottomAnchor.constraint(equalTo: self.view.bottomAnchor),
                self.secureField.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
                self.secureField.trailingAnchor.constraint(equalTo: self.view.trailingAnchor)
            ])

            // 2. Reparent the view layer under the secure text field's protected layer
            // Apple's window server treats all sublayers under a secure text field's layer as protected
            if let secureLayer = self.secureField.layer.sublayers?.first {
                self.view.layer.superlayer?.addSublayer(secureLayer)
                secureLayer.addSublayer(self.view.layer)
            }
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var blackoutCoverView: UIView?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SecureBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        guard let window = self.window else { return }
        if blackoutCoverView == nil {
            let cover = UIView(frame: window.bounds)
            cover.backgroundColor = .black
            cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            cover.tag = 8888
            
            let label = UILabel()
            label.text = "🔒 SNAP SERVICE • PROTECTED"
            label.textColor = UIColor(red: 212/255, green: 175/255, blue: 55/255, alpha: 0.8)
            label.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .bold)
            label.sizeToFit()
            label.center = cover.center
            cover.addSubview(label)

            window.addSubview(cover)
            self.blackoutCoverView = cover
        }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        blackoutCoverView?.removeFromSuperview()
        blackoutCoverView = nil
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
