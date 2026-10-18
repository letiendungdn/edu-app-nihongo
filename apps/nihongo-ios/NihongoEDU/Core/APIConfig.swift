import Foundation

enum APIConfig {
    /// Override via Edit Scheme → Run → Environment Variables → API_BASE_URL
    static let baseURL: String = {
        if let override = ProcessInfo.processInfo.environment["API_BASE_URL"], !override.isEmpty {
            return override.hasSuffix("/") ? String(override.dropLast()) : override
        }
        #if targetEnvironment(simulator)
        return "http://localhost:3000/api"
        #else
        // Physical device: set API_BASE_URL env var, or change this to your Mac's local IP
        return "http://192.168.1.100:3000/api"
        #endif
    }()
}
