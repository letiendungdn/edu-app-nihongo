import Foundation

/// Đổi lỗi kỹ thuật thành câu người học hiểu được. Không hiện thẳng "Could not connect to the server."
extension Error {
    var userMessage: String {
        if let api = self as? APIError {
            switch api {
            case .badStatus(401), .badStatus(403): return "Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé."
            case .badStatus(404): return "Không tìm thấy dữ liệu."
            case .badStatus(429): return "Bạn thao tác hơi nhanh, thử lại sau ít phút."
            case .badStatus(let c) where (500..<600).contains(c): return "Máy chủ đang gặp sự cố, thử lại sau."
            case .badStatus(let c): return "Có lỗi xảy ra (mã \(c))."
            case .invalidURL, .decodingFailed: return "Có lỗi xảy ra."
            }
        }
        if let url = self as? URLError {
            switch url.code {
            case .notConnectedToInternet, .cannotConnectToHost, .networkConnectionLost,
                 .timedOut, .cannotFindHost, .dataNotAllowed:
                return "Không có kết nối mạng."
            case .cancelled:
                return "Đã hủy."
            default:
                return "Không có kết nối mạng."
            }
        }
        let text = (self as? LocalizedError)?.errorDescription ?? localizedDescription
        return text.isEmpty ? "Có lỗi xảy ra." : text
    }
}
